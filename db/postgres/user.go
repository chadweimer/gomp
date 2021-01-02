package postgres

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
		UserDriver: &sqlcommon.UserDriver{driver.Driver},
	}
}

func (d userDriver) Create(user *models.User) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(user, tx)
	})
}

func (d userDriver) CreateTx(user *models.User, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return tx.Get(user, stmt, user.Username, user.PasswordHash, user.AccessLevel)
}
