package sqlite3

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/db/sqlcommon"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/jmoiron/sqlx"

	// sqlite database driver
	_ "github.com/mattn/go-sqlite3"

	// File source for db migration
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// DriverName is the name to use for this driver
const DriverName string = "sqlite3"

type driver struct {
	*sqlcommon.Driver

	app     *sqlcommon.AppConfigurationDriver
	recipes *recipeDriver
	images  *recipeImageDriver
	tags    *sqlcommon.TagDriver
	notes   *noteDriver
	links   *sqlcommon.LinkDriver
	users   *userDriver
}

// Open established a connection to the specified database and returns
// an object that implements db.Driver that can be used to query it.
func Open(path string, migrationsTableName string, migrationsForceVersion int) (db.Driver, error) {
	// Attempt to create the base path, if necessary
	fileURL, err := url.Parse(path)
	if err == nil && fileURL.Scheme == "file" {
		fullPath, err := filepath.Abs(fileURL.RequestURI())
		if err == nil {
			dir := filepath.Dir(fullPath)
			_ = os.MkdirAll(dir, 0755)
		}
	}

	db, err := sqlx.Connect(DriverName, path)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: '%+v'", err)
	}
	// This is meant to mitigate connection drops
	db.SetConnMaxLifetime(time.Minute * 15)

	if err := migrateDatabase(db, migrationsTableName, migrationsForceVersion); err != nil {
		return nil, fmt.Errorf("failed to migrate database: '%+v'", err)
	}

	drv := &driver{
		Driver: sqlcommon.New(db),
	}
	drv.app = &sqlcommon.AppConfigurationDriver{Driver: drv.Driver}
	drv.recipes = newRecipeDriver(drv)
	drv.images = newRecipeImageDriver(drv)
	drv.tags = &sqlcommon.TagDriver{Driver: drv.Driver}
	drv.notes = newNoteDriver(drv)
	drv.links = &sqlcommon.LinkDriver{Driver: drv.Driver}
	drv.users = newUserDriver(drv)

	return drv, nil
}

func (d *driver) AppConfiguration() db.AppConfigurationDriver {
	return d.app
}

func (d *driver) Recipes() db.RecipeDriver {
	return d.recipes
}

func (d *driver) Images() db.RecipeImageDriver {
	return d.images
}

func (d *driver) Tags() db.TagDriver {
	return d.tags
}

func (d *driver) Notes() db.NoteDriver {
	return d.notes
}

func (d *driver) Links() db.LinkDriver {
	return d.links
}

func (d *driver) Users() db.UserDriver {
	return d.users
}

func migrateDatabase(db *sqlx.DB, migrationsTableName string, migrationsForceVersion int) error {
	// Lock the database while we're migrating so that multiple instances
	// don't attempt to migrate simultaneously. This requires the same connection
	// to be used for both locking and unlocking.
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

	migrationPath := "file://" + filepath.Join("db", "migrations", DriverName)
	m, err := migrate.NewWithDatabaseInstance(
		migrationPath,
		DriverName,
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
