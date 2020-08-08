package postgres

import (
	"database/sql"
	"errors"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type postgresUserDriver struct {
	*postgresDriver
}

func (d *postgresUserDriver) Authenticate(username, password string) (*models.User, error) {
	user := new(User)

	if err := m.db.Get(user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
		return nil, err
	}

	if err := verifyPassword(user, password); err != nil {
		return nil, err
	}

	return user, nil
}

func (d *postgresUserDriver) Create(user *models.User) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(user, tx)
	})
}

func (d *postgresUserDriver) CreateTx(user *models.User, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return tx.Get(user, stmt, user.Username, user.PasswordHash, user.AccessLevel)
}

func (d *postgresUserDriver) Read(id int64) (*models.User, error) {
	user := new(User)

	err := m.db.Get(user, "SELECT * FROM app_user WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return user, nil
}

func (d *postgresUserDriver) Update(user *models.User) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateTx(user, tx)
	})
}

func (d *postgresUserDriver) UpdateTx(user *models.User, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE app_user SET username = $1, access_level = $2 WHERE ID = $3",
		user.Username, user.AccessLevel, user.ID)
	return err
}

func (d *postgresUserDriver) UpdatePassword(id int64, password, newPassword string) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdatePasswordTx(id, password, newPassword, tx)
	})
}

func (d *postgresUserDriver) UpdatePasswordTx(id int64, password, newPassword string, tx *sqlx.Tx) error {
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

func (d *postgresUserDriver) ReadSettings(id int64) (*models.UserSettings, error) {
	userSettings := new(models.UserSettings)

	if err := m.db.Get(userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
	}

	// Default to the application title if the user hasn't set their own
	if userSettings.HomeTitle == nil {
		userSettings.HomeTitle = &m.cfg.ApplicationTitle
	}

	return userSettings, nil
}

func (d *postgresUserDriver) UpdateSettings(settings *models.UserSettings) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateSettingsTx(settings, tx)
	})
}

func (d *postgresUserDriver) UpdateSettingsTx(settings *models.UserSettings, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE app_user_settings "+
			"SET home_title = $1, home_image_url = $2 WHERE user_id = $3",
		settings.HomeTitle, settings.HomeImageURL, settings.UserID)
	if err != nil {
		return err
	}

	return nil
}

func (d *postgresUserDriver) Delete(id int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteTx(id, tx)
	})
}

func (d *postgresUserDriver) DeleteTx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM app_user WHERE id = $1", id)
	return err
}

func (d *postgresUserDriver) List() (*[]models.User, error) {
	var users []models.User

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
