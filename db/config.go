package db

import (
	"errors"
	"fmt"
	"net/url"
)

// Config contains the database configuration settings
type Config struct {
	// Driver gets which database/sql driver to use.
	// Supported drivers: postgres, sqlite3
	Driver string `env:"DATABASE_DRIVER"`

	// ConnectionString gets the url (or path, connection string, etc) to use with the associated
	// database driver when opening the database connection.
	ConnectionString string `env:"DATABASE_URL" default:"file:data/data.db?_pragma=foreign_keys(1)"`

	// MigrationsTableName gets the name of the database migrations table to use.
	// Leave blank to use the default from https://github.com/golang-migrate/migrate.
	MigrationsTableName string `env:"MIGRATIONS_TABLE_NAME"`

	// MigrationsForceVersion gets a version to force the migrations to on startup.
	// Set to a non-positive number to skip forcing a version.
	MigrationsForceVersion int `env:"MIGRATIONS_FORCE_VERSION"`
}

func (c Config) validate() error {
	errs := make([]error, 0)

	if c.Driver != "" && c.Driver != PostgresDriverName && c.Driver != SQLiteDriverName {
		errs = append(errs, fmt.Errorf("driver must be one of ('%s', '%s')", PostgresDriverName, SQLiteDriverName))
	}

	if c.ConnectionString == "" {
		errs = append(errs, errors.New("connection string must be specified"))
	}

	if _, err := url.Parse(c.ConnectionString); err != nil {
		errs = append(errs, errors.New("connection string is invalid"))
	}

	return errors.Join(errs...)
}
