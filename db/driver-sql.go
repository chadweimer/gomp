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

type sqlDriverAdapter interface {
	sqlRecipeDriverAdapter
	sqlBackupDriverAdapter
}

// UserWithPasswordHash reprents a user including the password hash in the database
type UserWithPasswordHash struct {
	models.User

	PasswordHash string `json:"-" db:"password_hash"`
}

type sqlDriver struct {
	Db *sqlx.DB

	app               *sqlAppConfigurationDriver
	backups           *sqlBackupDriver
	links             *sqlLinkDriver
	notes             *sqlNoteDriver
	recipes           *sqlRecipeDriver
	users             *sqlUserDriver
	userSearchFilters *sqlUserSearchFilterDriver
	userSettings      *sqlUserSettingsDriver
	tags              *sqlTagDriver
}

func newSQLDriver(db *sqlx.DB, adapter sqlDriverAdapter, migrationsTableName string) *sqlDriver {
	return &sqlDriver{
		Db: db,

		app:               &sqlAppConfigurationDriver{db},
		backups:           &sqlBackupDriver{db, adapter, migrationsTableName},
		links:             &sqlLinkDriver{db},
		notes:             &sqlNoteDriver{db},
		recipes:           &sqlRecipeDriver{db, adapter},
		users:             &sqlUserDriver{db},
		userSearchFilters: &sqlUserSearchFilterDriver{db},
		userSettings:      &sqlUserSettingsDriver{db},
		tags:              &sqlTagDriver{db},
	}
}

func (d *sqlDriver) AppConfiguration() AppConfigurationDriver {
	return d.app
}

func (d *sqlDriver) Backups() BackupDriver {
	return d.backups
}

func (d *sqlDriver) Links() LinkDriver {
	return d.links
}

func (d *sqlDriver) Notes() NoteDriver {
	return d.notes
}

func (d *sqlDriver) Recipes() RecipeDriver {
	return d.recipes
}

func (d *sqlDriver) Users() UserDriver {
	return d.users
}

func (d *sqlDriver) UserSearchFilters() UserSearchFilterDriver {
	return d.userSearchFilters
}

func (d *sqlDriver) UserSettings() UserSettingsDriver {
	return d.userSettings
}

func (d *sqlDriver) Tags() TagDriver {
	return d.tags
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

func tx(ctx context.Context, db *sqlx.DB, op func(*sqlx.Tx) error) error {
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
