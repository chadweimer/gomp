package db

import (
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/samber/lo"
)

// Config represents the database configuration settings
type Config struct {
	// Driver gets which database/sql driver to use.
	// Supported drivers: postgres, sqlite
	Driver string `env:"DATABASE_DRIVER"`

	// URL gets the url (path, connection string, etc) to use with the associated
	// database driver when opening the database connection.
	URL url.URL `env:"DATABASE_URL" default:"file:data/data.db?_pragma=foreign_keys(1)"`

	// MigrationsTableName gets the name of the database migrations table to use.
	// Leave blank to use the default from https://github.com/golang-migrate/migrate.
	MigrationsTableName string `env:"MIGRATIONS_TABLE_NAME"`

	// MigrationsForceVersion gets a version to force the migrations to on startup.
	// Set to a non-positive number to skip forcing a version.
	MigrationsForceVersion int `env:"MIGRATIONS_FORCE_VERSION"`
}

func (c Config) validate() error {
	errs := make([]error, 0)

	allowedDrivers := []string{PostgresDriverName, SQLiteDriverName}
	if c.Driver != "" && !lo.Contains(allowedDrivers, c.Driver) {
		errs = append(errs, fmt.Errorf("database driver must be one of ('%s')", strings.Join(allowedDrivers, "', '")))
	}

	if c.URL == (url.URL{}) {
		errs = append(errs, errors.New("database url must be specified"))
	}

	return errors.Join(errs...)
}
