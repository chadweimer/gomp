package db

import (
	"database/sql"
	"errors"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type sqlUserDriver struct {
	*sqlDriver
}

func (d *sqlUserDriver) Authenticate(username, password string) (*models.User, error) {
	user := new(models.User)

	if err := d.Db.Get(user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
		return nil, err
	}

	if err := d.verifyPassword(user, password); err != nil {
		return nil, err
	}

	return user, nil
}

func (d *sqlUserDriver) Create(user *models.User) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(user, tx)
	})
}

func (d *sqlUserDriver) createtx(user *models.User, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3)"

	res, err := tx.Exec(stmt, user.Username, user.PasswordHash, user.AccessLevel)
	if err != nil {
		return err
	}
	user.ID, _ = res.LastInsertId()

	return nil
}

func (d *sqlUserDriver) Read(id int64) (*models.User, error) {
	user := new(models.User)

	err := d.Db.Get(user, "SELECT * FROM app_user WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return user, nil
}

func (d *sqlUserDriver) Update(user *models.User) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updatetx(user, tx)
	})
}

func (d *sqlUserDriver) updatetx(user *models.User, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE app_user SET username = $1, access_level = $2 WHERE ID = $3",
		user.Username, user.AccessLevel, user.ID)
	return err
}

func (d *sqlUserDriver) UpdatePassword(id int64, password, newPassword string) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updatePasswordtx(id, password, newPassword, tx)
	})
}

func (d *sqlUserDriver) updatePasswordtx(id int64, password, newPassword string, tx *sqlx.Tx) error {
	// Make sure the current password is correct
	user, err := d.Read(id)
	if err != nil {
		return err
	}
	err = d.verifyPassword(user, password)
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

func (d *sqlUserDriver) ReadSettings(id int64) (*models.UserSettings, error) {
	userSettings := new(models.UserSettings)

	if err := d.Db.Get(userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
	}

	return userSettings, nil
}

func (d *sqlUserDriver) UpdateSettings(settings *models.UserSettings) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updateSettingstx(settings, tx)
	})
}

func (d *sqlUserDriver) updateSettingstx(settings *models.UserSettings, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE app_user_settings "+
			"SET home_title = $1, home_image_url = $2 WHERE user_id = $3",
		settings.HomeTitle, settings.HomeImageURL, settings.UserID)
	if err != nil {
		return err
	}

	return nil
}

func (d *sqlUserDriver) Delete(id int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deletetx(id, tx)
	})
}

func (d *sqlUserDriver) deletetx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM app_user WHERE id = $1", id)
	return err
}

func (d *sqlUserDriver) List() (*[]models.User, error) {
	var users []models.User

	if err := d.Db.Select(&users, "SELECT * FROM app_user ORDER BY username ASC"); err != nil {
		return nil, err
	}

	return &users, nil
}

func (d *sqlUserDriver) verifyPassword(user *models.User, password string) error {
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return errors.New("username or password invalid")
	}

	return nil
}