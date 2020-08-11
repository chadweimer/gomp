package models

import (
	"database/sql"
	"database/sql/driver"
	"errors"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

// UserModel provides functionality to edit and authenticate users.
type UserModel struct {
	*Model
}

// UserLevel represents an enumeration of access levels that a user can have.
type UserLevel string

const (
	// AdminUserLevel represents an application-wide administator
	AdminUserLevel UserLevel = "admin"

	// EditorUserLevel represents a user that can add and editor recipes
	EditorUserLevel UserLevel = "editor"

	// ViewerUserLevel represents a user that can only view recipes
	ViewerUserLevel UserLevel = "viewer"
)

// User represents an individual user
type User struct {
	ID           int64     `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	PasswordHash string    `json:"-" db:"password_hash"`
	AccessLevel  UserLevel `json:"accessLevel" db:"access_level"`
}

// UserSettings represents the settings for an individual user
type UserSettings struct {
	UserID       int64   `json:"userId" db:"user_id"`
	HomeTitle    *string `json:"homeTitle" db:"home_title"`
	HomeImageURL *string `json:"homeImageUrl" db:"home_image_url"`
}

// Scan implements the sql.Scanner interface
func (u *UserLevel) Scan(value interface{}) error {
	asBytes, ok := value.([]byte)
	if !ok {
		return errors.New("Scan source is not []byte")
	}
	*u = UserLevel(string(asBytes))
	return nil
}

// Value implements the sql/driver.Valuer interface
func (u UserLevel) Value() (driver.Value, error) {
	return string(u), nil
}

// Authenticate verifies the username and password combination match an existing user
func (m *UserModel) Authenticate(username, password string) (*User, error) {
	user := new(User)

	if err := m.db.Get(user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
		return nil, err
	}

	if err := verifyPassword(user, password); err != nil {
		return nil, err
	}

	return user, nil
}

// Create stores the user in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *UserModel) Create(user *User) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(user, tx)
	})
}

// CreateTx stores the user in the database as a new record using
// the specified transaction.
func (m *UserModel) CreateTx(user *User, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return tx.Get(user, stmt, user.Username, user.PasswordHash, user.AccessLevel)
}

// Read retrieves the information about the user from the database, if found.
// If no user exists with the specified ID, a NoRecordFound error is returned.
func (m *UserModel) Read(id int64) (*User, error) {
	user := new(User)

	err := m.db.Get(user, "SELECT * FROM app_user WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return user, nil
}

// Update stores the user in the database by updating the existing record with the specified
// id using a dedicated transation that is committed if there are not errors.
func (m *UserModel) Update(user *User) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateTx(user, tx)
	})
}

// UpdateTx stores the user in the database by updating the existing record with the specified
// id using the specified transaction.
func (m *UserModel) UpdateTx(user *User, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE app_user SET username = $1, access_level = $2 WHERE ID = $3",
		user.Username, user.AccessLevel, user.ID)
	return err
}

// UpdatePassword updates the associated user's password, first verifying that the existing
// password is correct, using a dedicated transation that is committed if there are not errors.
func (m *UserModel) UpdatePassword(id int64, password, newPassword string) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdatePasswordTx(id, password, newPassword, tx)
	})
}

// UpdatePasswordTx updates the associated user's password, first verifying that the existing
// password is correct, using the specified transaction.
func (m *UserModel) UpdatePasswordTx(id int64, password, newPassword string, tx *sqlx.Tx) error {
	// Make sure the current password is correct
	user, err := m.Read(id)
	if err != nil {
		return err
	}
	err = verifyPassword(user, password)
	if err != nil {
		return err
	}

	newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("Invalid password specified")
	}

	_, err = tx.Exec("UPDATE app_user SET password_hash = $1 WHERE ID = $2",
		newPasswordHash, user.ID)
	return err
}

// ReadSettings retrieves the settings for the specified user from the database, if found.
// If no user exists with the specified ID, a NoRecordFound error is returned.
func (m *UserModel) ReadSettings(id int64) (*UserSettings, error) {
	userSettings := new(UserSettings)

	if err := m.db.Get(userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
	}

	// Default to the application title if the user hasn't set their own
	if userSettings.HomeTitle == nil {
		userSettings.HomeTitle = &m.cfg.ApplicationTitle
	}

	return userSettings, nil
}

// UpdateSettings stores the specified user settings in the database by updating the
// existing record using a dedicated transation that is committed if there are not errors.
func (m *UserModel) UpdateSettings(settings *UserSettings) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateSettingsTx(settings, tx)
	})
}

// UpdateSettingsTx stores the specified user settings in the database by updating the
// existing record using the specified transaction.
func (m *UserModel) UpdateSettingsTx(settings *UserSettings, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE app_user_settings "+
			"SET home_title = $1, home_image_url = $2 WHERE user_id = $3",
		settings.HomeTitle, settings.HomeImageURL, settings.UserID)
	if err != nil {
		return err
	}

	return nil
}

// Delete removes the specified user from the database using a dedicated transation
// that is committed if there are not errors.
func (m *UserModel) Delete(id int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified user from the database using the specified transaction.
func (m *UserModel) DeleteTx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM app_user WHERE id = $1", id)
	return err
}

// List retrieves all users in the database.
func (m *UserModel) List() (*[]User, error) {
	var users []User

	if err := m.db.Select(&users, "SELECT * FROM app_user ORDER BY username ASC"); err != nil {
		return nil, err
	}

	return &users, nil
}

func verifyPassword(user *User, password string) error {
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return errors.New("username or password invalid")
	}

	return nil
}
