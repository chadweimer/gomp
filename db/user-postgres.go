package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type postgresUserDriver struct {
	*sqlUserDriver
}

func (d postgresUserDriver) Create(user *models.User) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(user, tx)
	})
}

func (d postgresUserDriver) createtx(user *models.User, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return tx.Get(user, stmt, user.Username, user.PasswordHash, user.AccessLevel)
}
