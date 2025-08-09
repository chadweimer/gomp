package main

import (
	"errors"
	"log/slog"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
)

const defaultSecureKey = "ChangeMe"

// Config represents the application configuration settings
type Config struct {
	// FileAccess contains the file access configuration settings
	FileAccess fileaccess.Config

	// Database contains the database configuration settings
	Database db.Config

	// Port gets the port number under which the site is being hosted.
	Port int `env:"PORT" default:"5000"`

	// IsDevelopment defines whether to run the application in "development mode".
	// Development mode turns on additional features, such as logging, that may
	// not be desirable in a production environment.
	IsDevelopment bool `env:"IS_DEVELOPMENT" default:"false"`

	// BaseAssetsPath gets the base path to the client assets.
	BaseAssetsPath string `env:"BASE_ASSETS_PATH" default:"static"`

	// SecureKeys is used for session authentication. Recommended to be 32 or 64 ASCII characters.
	// Multiple keys can be separated by commas.
	SecureKeys []string `env:"SECURE_KEY" default:"ChangeMe"`
}

func (c Config) validate() error {
	errs := make([]error, 0)

	if c.Port <= 0 {
		errs = append(errs, errors.New("port must be a positive integer"))
	}

	if c.BaseAssetsPath == "" {
		errs = append(errs, errors.New("base assets path must be specified"))
	}

	if len(c.SecureKeys) == 0 {
		errs = append(errs, errors.New("secure keys must be specified with 1 or more keys separated by a comma"))
	} else if len(c.SecureKeys) == 1 && c.SecureKeys[0] == defaultSecureKey {
		slog.Warn("Using default secure key. It is highly recommended that this be changed to something unique.", slog.String("value", defaultSecureKey))
	}

	return errors.Join(errs...)
}
