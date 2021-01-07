package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/db/sqlcommon"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/jmoiron/sqlx"

	// postgres database driver
	_ "github.com/lib/pq"

	// File source for db migration
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// DriverName is the name to use for this driver
const DriverName string = "postgres"

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
func Open(hostURL string, migrationsTableName string, migrationsForceVersion int) (db.Driver, error) {
	// In docker, on first bring up, the DB takes a little while.
	// Let's try a few times to establish connection before giving up.
	const maxAttempts = 20
	var db *sqlx.DB
	var err error
	for i := 1; i <= maxAttempts; i++ {
		db, err = sqlx.Connect(DriverName, hostURL)
		if err == nil {
			break
		}

		if i < maxAttempts {
			log.Printf("Failed to open database on attempt %d: '%+v'. Will try again...", i, err)
			time.Sleep(500 * time.Millisecond)
		} else {
			return nil, fmt.Errorf("giving up after failing to open database on attempt %d: '%+v'", i, err)
		}
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
	// This should block until the lock has been acquired
	if err := lock(conn); err != nil {
		return err
	}
	defer unlock(conn)

	driver, err := postgres.WithInstance(db.DB, &postgres.Config{
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

func lock(conn *sql.Conn) error {
	stmt := `SELECT pg_advisory_lock(1)`
	_, err := conn.ExecContext(context.Background(), stmt)
	return err
}

func unlock(conn *sql.Conn) error {
	stmt := `SELECT pg_advisory_unlock(1)`
	_, err := conn.ExecContext(context.Background(), stmt)
	return err
}
