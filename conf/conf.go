package conf

import (
	"errors"
	"fmt"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/chadweimer/gomp/db/postgres"
	"github.com/chadweimer/gomp/db/sqlite3"
	"github.com/chadweimer/gomp/upload"
)

// Config contains the application configuration settings
type Config struct {
	// Port gets the port number under which the site is being hosted.
	Port int

	// UploadDriver is used to select which backend data store is used for file uploads.
	// Supported drivers: fs, s3
	UploadDriver string

	// UploadPath gets the path (full or relative) under which to store uploads.
	// When using Amazon S3, this should be set to the bucket name.
	UploadPath string

	// IsDevelopment defines whether to run the application in "development mode".
	// Development mode turns on additional features, such as logging, that may
	// not be desirable in a production environment.
	IsDevelopment bool

	// SecureKeys is used for session authentication. Recommended to be 32 or 64 ASCII characters.
	// Multiple keys can be separated by commas.
	SecureKeys []string

	// ApplicationTitle is used where the application name (title) is displayed on screen.
	ApplicationTitle string

	// DatabaseDriver gets which database/sql driver to use.
	// Supported drivers: postgres, sqlite
	DatabaseDriver string

	// DatabaseUrl gets the url (or path, connection string, etc) to use with the associated
	// database driver when opening the database connection.
	DatabaseURL string

	// MigrationsTableName gets the name of the database migrations table to use.
	// Leave blank to use the default from https://github.com/golang-migrate/migrate.
	MigrationsTableName string

	// MigrationsForceVersion gets a version to force the migrations to on startup.
	// Set to a negative number to skip forcing a version.
	MigrationsForceVersion int

	// BaseAssetsPath gets the base path to the client assets.
	BaseAssetsPath string
}

// Load reads the configuration file from the specified path
func Load() *Config {
	c := Config{
		Port:                   4000,
		UploadDriver:           "fs",
		UploadPath:             filepath.Join("data", "uploads"),
		IsDevelopment:          false,
		SecureKeys:             nil,
		ApplicationTitle:       "GOMP: Go Meal Planner",
		DatabaseDriver:         "",
		DatabaseURL:            "file:" + filepath.Join("data", "data.db"),
		MigrationsTableName:    "",
		MigrationsForceVersion: -1,
		BaseAssetsPath:         "static",
	}

	// If environment variables are set, use them.
	loadEnv("PORT", &c.Port)
	loadEnv("GOMP_UPLOAD_DRIVER", &c.UploadDriver)
	loadEnv("GOMP_UPLOAD_PATH", &c.UploadPath)
	loadEnv("GOMP_IS_DEVELOPMENT", &c.IsDevelopment)
	loadEnv("SECURE_KEY", &c.SecureKeys)
	loadEnv("GOMP_APPLICATION_TITLE", &c.ApplicationTitle)
	loadEnv("GOMP_BASE_ASSETS_PATH", &c.BaseAssetsPath)
	loadEnv("DATABASE_DRIVER", &c.DatabaseDriver)
	loadEnv("DATABASE_URL", &c.DatabaseURL)
	loadEnv("GOMP_MIGRATIONS_TABLE_NAME", &c.MigrationsTableName)
	loadEnv("GOMP_MIGRATIONS_FORCE_VERSION", &c.MigrationsForceVersion)

	// Special case for backward compatibility
	if c.DatabaseDriver == "" {
		if c.IsDevelopment {
			log.Print("[config] DATABASE_DRIVER is empty. Will attempt to infer...")
		}
		if strings.HasPrefix(c.DatabaseURL, "file:") {
			if c.IsDevelopment {
				log.Printf("[config] Setting DATABASE_DRIVER to '%s'", sqlite3.DriverName)
			}
			c.DatabaseDriver = sqlite3.DriverName
		} else if strings.HasPrefix(c.DatabaseURL, "postgres:") {
			if c.IsDevelopment {
				log.Printf("[config] Setting DATABASE_DRIVER to '%s'", postgres.DriverName)
			}
			c.DatabaseDriver = postgres.DriverName
		} else if c.IsDevelopment {
			log.Print("[config] Unable to infer a value for DATABASE_DRIVER")
		}
	}

	if c.IsDevelopment {
		log.Printf("[config] Port=%d", c.Port)
		log.Printf("[config] UploadDriver=%s", c.UploadDriver)
		log.Printf("[config] UploadPath=%s", c.UploadPath)
		log.Printf("[config] IsDevelopment=%t", c.IsDevelopment)
		log.Printf("[config] SecureKeys=%s", c.SecureKeys)
		log.Printf("[config] ApplicationTitle=%s", c.ApplicationTitle)
		log.Printf("[config] BaseAssetsPath=%s", c.BaseAssetsPath)
		log.Printf("[config] DatabaseDriver=%s", c.DatabaseDriver)
		log.Printf("[config] DatabaseURL=%s", c.DatabaseURL)
		log.Printf("[config] MigrationsTableName=%s", c.MigrationsTableName)
		log.Printf("[config] MigrationsForceVersion=%d", c.MigrationsForceVersion)
	}

	return &c
}

// Validate checks whether the current configuration settings are valid.
func (c Config) Validate() error {
	if c.Port <= 0 {
		return errors.New("PORT must be a positive integer")
	}

	if c.UploadDriver != upload.FileSystemDriver && c.UploadDriver != upload.S3Driver {
		return fmt.Errorf("GOMP_UPLOAD_DRIVER must be one of ('%s', '%s')", upload.FileSystemDriver, upload.S3Driver)
	}

	if c.UploadPath == "" {
		return errors.New("GOMP_UPLOAD_PATH must be specified")
	}

	if c.SecureKeys == nil || len(c.SecureKeys) < 1 {
		return errors.New("SECURE_KEY must be specified with 1 or more keys separated by a comma")
	}

	if c.ApplicationTitle == "" {
		return errors.New("GOMP_APPLICATION_TITLE must be specified")
	}

	if c.BaseAssetsPath == "" {
		return errors.New("GOMP_BASE_ASSETS_PATH must be specified")
	}

	if c.DatabaseDriver != postgres.DriverName && c.DatabaseDriver != sqlite3.DriverName {
		return fmt.Errorf("DATABASE_DRIVER must be one of ('%s', '%s')", postgres.DriverName, sqlite3.DriverName)
	}

	if c.DatabaseURL == "" {
		return errors.New("DATABASE_URL must be specified")
	}

	if _, err := url.Parse(c.DatabaseURL); err != nil {
		return errors.New("DATABASE_URL is invalid")
	}

	return nil
}

func loadEnv(name string, dest interface{}) {
	var err error
	if envStr, ok := os.LookupEnv(name); ok {
		switch dest := dest.(type) {
		case *string:
			*dest = envStr
		case *[]string:
			*dest = strings.Split(envStr, ",")
		case *int:
			if *dest, err = strconv.Atoi(envStr); err != nil {
				log.Fatalf("[config] Failed to convert %s environment variable to an integer. Value = %s, Error = %s",
					name, envStr, err)
			}
		case *bool:
			*dest = envStr != "0"
		}
	}
}
