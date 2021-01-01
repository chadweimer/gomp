package sqlite3

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/db"
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

type sqliteDriver struct {
	db *sqlx.DB

	recipes *sqliteRecipeDriver
	images  *sqliteRecipeImageDriver
	tags    *sqliteTagDriver
	notes   *sqliteNoteDriver
	links   *sqliteLinkDriver
	users   *sqliteUserDriver
}

// Open established a connection to the specified database and returns
// an object that implements db.Driver that can be used to query it.
func Open(path string, migrationsTableName string, migrationsForceVersion int) (db.Driver, error) {
	// In docker, on first bring up, the DB takes a little while.
	// Let's try a few times to establish connection before giving up.
	const maxAttempts = 20
	var db *sqlx.DB
	var err error
	for i := 1; i <= maxAttempts; i++ {
		db, err = sqlx.Connect(DriverName, path)
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

	drv := &sqliteDriver{
		db: db,
	}
	drv.recipes = &sqliteRecipeDriver{drv}
	drv.images = &sqliteRecipeImageDriver{drv}
	drv.tags = &sqliteTagDriver{drv}
	drv.notes = &sqliteNoteDriver{drv}
	drv.links = &sqliteLinkDriver{drv}
	drv.users = &sqliteUserDriver{drv}

	return drv, nil
}

func (d sqliteDriver) Close() error {
	log.Print("Closing database connection...")
	if err := d.db.Close(); err != nil {
		return fmt.Errorf("failed to close the connection to the database: '%+v'", err)
	}

	return nil
}

func (d sqliteDriver) Recipes() db.RecipeDriver {
	return d.recipes
}

func (d sqliteDriver) Images() db.RecipeImageDriver {
	return d.images
}

func (d sqliteDriver) Tags() db.TagDriver {
	return d.tags
}

func (d sqliteDriver) Notes() db.NoteDriver {
	return d.notes
}

func (d sqliteDriver) Links() db.LinkDriver {
	return d.links
}

func (d sqliteDriver) Users() db.UserDriver {
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

	migrationPath := "file://" + filepath.Join("db", DriverName, "migrations")
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

func (d sqliteDriver) tx(op func(*sqlx.Tx) error) error {
	tx, err := d.db.Beginx()
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
