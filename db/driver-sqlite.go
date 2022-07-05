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

	recipes *sqliteRecipeDriver
}

func openSQLite(connectionString string, migrationsTableName string, migrationsForceVersion int) (Driver, error) {
	// Attempt to create the base path, if necessary
	fileUrl, err := url.Parse(connectionString)
	if err != nil {
		return nil, err
	}
	if fileUrl.Scheme == "file" {
		fullPath, err := filepath.Abs(fileUrl.RequestURI())
		if err != nil {
			return nil, err
		}

		dir := filepath.Dir(fullPath)
		if err = os.MkdirAll(dir, 0750); err != nil {
			return nil, err
		}
	}

	db, err := sqlx.Connect(SQLiteDriverName, connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: '%w'", err)
	}
	// This is meant to mitigate connection drops
	db.SetConnMaxLifetime(time.Minute * 15)

	sqlDriver := &sqlDriver{
		Db: db,

		app:    &sqlAppConfigurationDriver{db},
		images: &sqlRecipeImageDriver{db},
		tags:   &sqlTagDriver{db},
		notes:  &sqlNoteDriver{db},
		links:  &sqlLinkDriver{db},
		users:  &sqlUserDriver{db},
	}
	drv := &sqliteDriver{
		sqlDriver: sqlDriver,
		recipes:   &sqliteRecipeDriver{&sqlRecipeDriver{sqlDriver}},
	}

	if err := drv.migrateDatabase(db, migrationsTableName, migrationsForceVersion); err != nil {
		return nil, fmt.Errorf("failed to migrate database: '%w'", err)
	}

	return drv, nil
}

func (d *sqliteDriver) Recipes() RecipeDriver {
	return d.recipes
}

func (*sqliteDriver) migrateDatabase(db *sqlx.DB, migrationsTableName string, migrationsForceVersion int) error {
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
