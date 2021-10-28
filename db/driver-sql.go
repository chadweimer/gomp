package db

import (
	"fmt"
	"log"

	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
)

// UserWithPasswordHash reprents a user including the password hash in the database
type UserWithPasswordHash struct {
	models.User

	PasswordHash string `json:"-" db:"password_hash"`
}

type sqlDriver struct {
	Db *sqlx.DB
}

func (d *sqlDriver) Close() error {
	log.Print("Closing database connection...")
	if err := d.Db.Close(); err != nil {
		return fmt.Errorf("failed to close the connection to the database: '%+v'", err)
	}

	return nil
}

func (d *sqlDriver) tx(op func(*sqlx.Tx) error) error {
	tx, err := d.Db.Beginx()
	if err != nil {
		return err
	}
	defer func() {
		if recv := recover(); recv != nil {
			// Make sure to rollback after a panic...
			tx.Rollback()

			// ... but let the panicing continue
			panic(recv)
		}
	}()

	if err = op(tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
