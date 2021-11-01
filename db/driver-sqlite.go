package db

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/jmoiron/sqlx"

	// sqlite database driver
	_ "github.com/mattn/go-sqlite3"

	// File source for db migration
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// SQLiteDriverName is the name to use for this driver
const SQLiteDriverName string = "sqlite3"

type sqliteDriver struct {
	*sqlDriver

	app     *sqlAppConfigurationDriver
	recipes *sqliteRecipeDriver
	images  *sqlRecipeImageDriver
	tags    *sqlTagDriver
	notes   *sqlNoteDriver
	links   *sqlLinkDriver
	users   *sqlUserDriver
}

func openSQLite(connectionString string, migrationsTableName string, migrationsForceVersion int) (Driver, error) {
	// Attempt to create the base path, if necessary
	fileUrl, err := url.Parse(connectionString)
	if err == nil && fileUrl.Scheme == "file" {
		fullPath, err := filepath.Abs(fileUrl.RequestURI())
		if err == nil {
			dir := filepath.Dir(fullPath)
			_ = os.MkdirAll(dir, 0755)
		}
	}

	db, err := sqlx.Connect(SQLiteDriverName, connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: '%+v'", err)
	}
	// This is meant to mitigate connection drops
	db.SetConnMaxLifetime(time.Minute * 15)

	sqlDriver := &sqlDriver{Db: db}
	drv := &sqliteDriver{
		sqlDriver: sqlDriver,

		app:    &sqlAppConfigurationDriver{sqlDriver},
		images: &sqlRecipeImageDriver{sqlDriver},
		tags:   &sqlTagDriver{sqlDriver},
		notes:  &sqlNoteDriver{sqlDriver},
		links:  &sqlLinkDriver{sqlDriver},
		users:  &sqlUserDriver{sqlDriver},
	}
	drv.recipes = &sqliteRecipeDriver{
		sqliteDriver:    drv,
		sqlRecipeDriver: &sqlRecipeDriver{sqlDriver},
	}

	if err := drv.migrateDatabase(db, migrationsTableName, migrationsForceVersion); err != nil {
		return nil, fmt.Errorf("failed to migrate database: '%+v'", err)
	}

	return drv, nil
}

func (d *sqliteDriver) AppConfiguration() AppConfigurationDriver {
	return d.app
}

func (d *sqliteDriver) Recipes() RecipeDriver {
	return d.recipes
}

func (d *sqliteDriver) Images() RecipeImageDriver {
	return d.images
}

func (d *sqliteDriver) Tags() TagDriver {
	return d.tags
}

func (d *sqliteDriver) Notes() NoteDriver {
	return d.notes
}

func (d *sqliteDriver) Links() LinkDriver {
	return d.links
}

func (d *sqliteDriver) Users() UserDriver {
	return d.users
}

func (d *sqliteDriver) migrateDatabase(db *sqlx.DB, migrationsTableName string, migrationsForceVersion int) error {
	conn, err := db.Conn(context.Background())
	if err != nil {
		return err
	}
	defer conn.Close()

	driver, err := sqlite3.WithInstance(db.DB, &sqlite3.Config{
		MigrationsTable: migrationsTableName,
	})
	if err != nil {
		return err
	}

	migrationPath := "file://" + filepath.Join("db", "migrations", SQLiteDriverName)
	m, err := migrate.NewWithDatabaseInstance(
		migrationPath,
		SQLiteDriverName,
		driver)
	if err != nil {
		return err
	}

	if migrationsForceVersion > 0 {
		err = m.Force(migrationsForceVersion)
	} else {
		err = m.Up()
	}
	if err != nil && err != migrate.ErrNoChange {
		return err
	}

	return nil
}
