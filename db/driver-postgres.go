package db

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"

	// postgres database driver
	_ "github.com/lib/pq"

	// File source for db migration
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// PostgresDriverName is the name to use for this driver
const PostgresDriverName string = "postgres"

type postgresDriver struct {
	*sqlDriver

	app     *sqlAppConfigurationDriver
	recipes *postgresRecipeDriver
	images  *postgresRecipeImageDriver
	tags    *sqlTagDriver
	notes   *postgresNoteDriver
	links   *sqlLinkDriver
	users   *postgresUserDriver
}

func openPostgres(connectionString string, migrationsTableName string, migrationsForceVersion int) (Driver, error) {
	// In docker, on first bring up, the DB takes a little while.
	// Let's try a few times to establish connection before giving up.
	const maxAttempts = 20
	var db *sqlx.DB
	var err error
	for i := 1; i <= maxAttempts; i++ {
		db, err = sqlx.Connect(PostgresDriverName, connectionString)
		if err == nil {
			break
		}

		if i < maxAttempts {
			log.Err(err).Int("attempt", i).Msg("Failed to open database. Will try again...")
			time.Sleep(500 * time.Millisecond)
		} else {
			return nil, fmt.Errorf("giving up after failing to open database on attempt %d: '%+v'", i, err)
		}
	}
	// This is meant to mitigate connection drops
	db.SetConnMaxLifetime(time.Minute * 15)

	sqlDriver := &sqlDriver{Db: db}
	drv := &postgresDriver{
		sqlDriver: sqlDriver,

		app:    &sqlAppConfigurationDriver{sqlDriver},
		images: &postgresRecipeImageDriver{&sqlRecipeImageDriver{sqlDriver}},
		tags:   &sqlTagDriver{sqlDriver},
		notes:  &postgresNoteDriver{&sqlNoteDriver{sqlDriver}},
		links:  &sqlLinkDriver{sqlDriver},
		users:  &postgresUserDriver{&sqlUserDriver{sqlDriver}},
	}
	drv.recipes = &postgresRecipeDriver{
		postgresDriver:  drv,
		sqlRecipeDriver: &sqlRecipeDriver{sqlDriver},
	}

	if err := drv.migrateDatabase(db, migrationsTableName, migrationsForceVersion); err != nil {
		return nil, fmt.Errorf("failed to migrate database: '%+v'", err)
	}

	return drv, nil
}

func (d *postgresDriver) AppConfiguration() AppConfigurationDriver {
	return d.app
}

func (d *postgresDriver) Recipes() RecipeDriver {
	return d.recipes
}

func (d *postgresDriver) Images() RecipeImageDriver {
	return d.images
}

func (d *postgresDriver) Tags() TagDriver {
	return d.tags
}

func (d *postgresDriver) Notes() NoteDriver {
	return d.notes
}

func (d *postgresDriver) Links() LinkDriver {
	return d.links
}

func (d *postgresDriver) Users() UserDriver {
	return d.users
}

func (d *postgresDriver) migrateDatabase(db *sqlx.DB, migrationsTableName string, migrationsForceVersion int) error {
	// Lock the database while we're migrating so that multiple instances
	// don't attempt to migrate simultaneously. This requires the same connection
	// to be used for both locking and unlocking.
	conn, err := db.Conn(context.Background())
	if err != nil {
		return err
	}
	defer conn.Close()
	// This should block until the lock has been acquired
	if err := lockPostgres(conn); err != nil {
		return err
	}
	defer unlockPostgres(conn)

	driver, err := postgres.WithInstance(db.DB, &postgres.Config{
		MigrationsTable: migrationsTableName,
	})
	if err != nil {
		return err
	}

	migrationPath := "file://" + filepath.Join("db", "migrations", PostgresDriverName)
	m, err := migrate.NewWithDatabaseInstance(
		migrationPath,
		PostgresDriverName,
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

func lockPostgres(conn *sql.Conn) error {
	stmt := `SELECT pg_advisory_lock(1)`
	_, err := conn.ExecContext(context.Background(), stmt)
	return err
}

func unlockPostgres(conn *sql.Conn) error {
	stmt := `SELECT pg_advisory_unlock(1)`
	_, err := conn.ExecContext(context.Background(), stmt)
	return err
}
