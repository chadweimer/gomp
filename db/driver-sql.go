package db

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

// UserWithPasswordHash reprents a user including the password hash in the database
type UserWithPasswordHash struct {
	models.User

	PasswordHash string `json:"-" db:"password_hash"`
}

type sqlDriver struct {
	Db *sqlx.DB

	app    *sqlAppConfigurationDriver
	images *sqlRecipeImageDriver
	tags   *sqlTagDriver
	notes  *sqlNoteDriver
	links  *sqlLinkDriver
	users  *sqlUserDriver
}

func (d *sqlDriver) AppConfiguration() AppConfigurationDriver {
	return d.app
}

func (d *sqlDriver) Images() RecipeImageDriver {
	return d.images
}

func (d *sqlDriver) Tags() TagDriver {
	return d.tags
}

func (d *sqlDriver) Notes() NoteDriver {
	return d.notes
}

func (d *sqlDriver) Links() LinkDriver {
	return d.links
}

func (d *sqlDriver) Users() UserDriver {
	return d.users
}

func (d *sqlDriver) Close() error {
	log.Debug().Msg("Closing database connection...")
	if err := d.Db.Close(); err != nil {
		return fmt.Errorf("failed to close the connection to the database: '%w'", err)
	}

	return nil
}

func get[T any](db sqlx.Queryer, op func(sqlx.Queryer) (T, error)) (T, error) {
	t, err := op(db)
	return t, mapSqlErrors(err)
}

func tx(db *sqlx.DB, op func(sqlx.Ext) error) error {
	tx, err := db.Beginx()
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
		return mapSqlErrors(err)
	}

	return tx.Commit()
}

func mapSqlErrors(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}

	return err
}
