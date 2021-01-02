package sqlcommon

import (
	"database/sql"
	"errors"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type UserDriver struct {
	*Driver
}

func (d UserDriver) Authenticate(username, password string) (*models.User, error) {
	user := new(models.User)

	if err := d.Db.Get(user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
		return nil, err
	}

	if err := verifyPassword(user, password); err != nil {
		return nil, err
	}

	return user, nil
}

func (d UserDriver) Read(id int64) (*models.User, error) {
	user := new(models.User)

	err := d.Db.Get(user, "SELECT * FROM app_user WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, db.ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return user, nil
}

func (d UserDriver) Update(user *models.User) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.UpdateTx(user, tx)
	})
}

func (d UserDriver) UpdateTx(user *models.User, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE app_user SET username = $1, access_level = $2 WHERE ID = $3",
		user.Username, user.AccessLevel, user.ID)
	return err
}

func (d UserDriver) UpdatePassword(id int64, password, newPassword string) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.UpdatePasswordTx(id, password, newPassword, tx)
	})
}

func (d UserDriver) UpdatePasswordTx(id int64, password, newPassword string, tx *sqlx.Tx) error {
	// Make sure the current password is correct
	user, err := d.Read(id)
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

func (d UserDriver) ReadSettings(id int64) (*models.UserSettings, error) {
	userSettings := new(models.UserSettings)

	if err := d.Db.Get(userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
	}

	return userSettings, nil
}

func (d UserDriver) UpdateSettings(settings *models.UserSettings) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.UpdateSettingsTx(settings, tx)
	})
}

func (d UserDriver) UpdateSettingsTx(settings *models.UserSettings, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE app_user_settings "+
			"SET home_title = $1, home_image_url = $2 WHERE user_id = $3",
		settings.HomeTitle, settings.HomeImageURL, settings.UserID)
	if err != nil {
		return err
	}

	return nil
}

func (d UserDriver) Delete(id int64) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(id, tx)
	})
}

func (d UserDriver) DeleteTx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM app_user WHERE id = $1", id)
	return err
}

func (d UserDriver) List() (*[]models.User, error) {
	var users []models.User

	if err := d.Db.Select(&users, "SELECT * FROM app_user ORDER BY username ASC"); err != nil {
		return nil, err
	}

	return &users, nil
}

func verifyPassword(user *models.User, password string) error {
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return errors.New("username or password invalid")
	}

	return nil
}
