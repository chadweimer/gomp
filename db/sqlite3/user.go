package sqlite3

import (
	"github.com/chadweimer/gomp/db/sqlcommon"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type userDriver struct {
	*sqlcommon.UserDriver
}

func newUserDriver(driver *driver) *userDriver {
	return &userDriver{
		UserDriver: &sqlcommon.UserDriver{Driver: driver.Driver},
	}
}

func (d userDriver) Create(user *models.User) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(user, tx)
	})
}

func (d userDriver) CreateTx(user *models.User, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3)"

	res, err := tx.Exec(stmt, user.Username, user.PasswordHash, user.AccessLevel)
	if err != nil {
		return err
	}
	user.ID, _ = res.LastInsertId()

	return nil
}
