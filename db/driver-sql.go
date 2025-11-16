package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

// UserWithPasswordHash reprents a user including the password hash in the database
type UserWithPasswordHash struct {
	models.User

	PasswordHash string `json:"-" db:"password_hash"`
}

type sqlDriver struct {
	Db *sqlx.DB

	app     *sqlAppConfigurationDriver
	recipes *sqlRecipeDriver
	images  *sqlRecipeImageDriver
	notes   *sqlNoteDriver
	links   *sqlLinkDriver
	users   *sqlUserDriver
}

func newSQLDriver(db *sqlx.DB, adapter sqlRecipeDriverAdapter) *sqlDriver {
	return &sqlDriver{
		Db: db,

		app:     &sqlAppConfigurationDriver{db},
		recipes: &sqlRecipeDriver{db, adapter},
		images:  &sqlRecipeImageDriver{db},
		notes:   &sqlNoteDriver{db},
		links:   &sqlLinkDriver{db},
		users:   &sqlUserDriver{db},
	}
}

func (d *sqlDriver) AppConfiguration() AppConfigurationDriver {
	return d.app
}

func (d *sqlDriver) Recipes() RecipeDriver {
	return d.recipes
}

func (d *sqlDriver) Images() RecipeImageDriver {
	return d.images
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
	slog.Debug("Closing database connection...")
	if err := d.Db.Close(); err != nil {
		return fmt.Errorf("failed to close the connection to the database: '%w'", err)
	}

	return nil
}

func get[T any](db sqlx.QueryerContext, op func(sqlx.QueryerContext) (T, error)) (T, error) {
	t, err := op(db)
	return t, mapSQLErrors(err)
}

func tx(ctx context.Context, db *sqlx.DB, op func(sqlx.ExtContext) error) error {
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if recv := recover(); recv != nil {
			// Make sure to rollback after a panic...
			_ = tx.Rollback()

			// ... but let the panicing continue
			panic(recv)
		}
	}()

	if err = op(tx); err != nil {
		_ = tx.Rollback()
		return mapSQLErrors(err)
	}

	return tx.Commit()
}

func mapSQLErrors(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}

	return err
}
