package models

import (
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

// UserModel provides functionality to edit and authenticate users.
type UserModel struct {
	*Model
}

// User represents an individual user
type User struct {
	ID           int64  `db:"id"`
	Username     string `db:"username"`
	PasswordHash string `db:"password_hash"`
}

// UserSettings represents the settings for an individual user
type UserSettings struct {
	UserID       int64  `json:"userId" db:"user_id"`
	HomeTitle    string `json:"homeTitle" db:"home_title"`
	HomeImageURL string `json:"homeImageUrl" db:"home_image_url"`
}

// Authenticate verifies the username and password combination match an existing user
func (m *UserModel) Authenticate(username, password string) (*User, error) {
	user := new(User)

	if err := m.db.Get(user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, err
	}

	return user, nil
}

func (m *UserModel) Read(id int64) (*User, error) {
	user := new(User)

	if err := m.db.Select(user, "SELECT * FROM app_user WHERE id = $1", id); err != nil {
		return nil, err
	}

	return user, nil
}

// ReadSettings retrieves the settings for the specified user from the database, if found.
// If no user exists with the specified ID, a NoRecordFound error is returned.
func (m *UserModel) ReadSettings(id int64) (*UserSettings, error) {
	userSettings := new(UserSettings)

	if err := m.db.Get(userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
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
