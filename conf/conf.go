package conf

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"reflect"
	"strconv"
	"strings"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
)

// Config contains the application configuration settings
type Config struct {
	// Port gets the port number under which the site is being hosted.
	Port int `env:"PORT" default:"5000"`

	// UploadDriver is used to select which backend data store is used for file uploads.
	// Supported drivers: fs, s3
	UploadDriver string `env:"UPLOAD_DRIVER" default:"fs"`

	// UploadPath gets the path (full or relative) under which to store uploads.
	// When using Amazon S3, this should be set to the bucket name.
	UploadPath string `env:"UPLOAD_PATH" default:"data/uploads"`

	// IsDevelopment defines whether to run the application in "development mode".
	// Development mode turns on additional features, such as logging, that may
	// not be desirable in a production environment.
	IsDevelopment bool `env:"IS_DEVELOPMENT" default:"false"`

	// SecureKeys is used for session authentication. Recommended to be 32 or 64 ASCII characters.
	// Multiple keys can be separated by commas.
	SecureKeys []string `env:"SECURE_KEY" default:"ChangeMe"`

	// DatabaseDriver gets which database/sql driver to use.
	// Supported drivers: postgres, sqlite3
	DatabaseDriver string `env:"DATABASE_DRIVER"`

	// DatabaseURL gets the url (or path, connection string, etc) to use with the associated
	// database driver when opening the database connection.
	DatabaseURL string `env:"DATABASE_URL" default:"file:data/data.db?_pragma=foreign_keys(1)"`

	// MigrationsTableName gets the name of the database migrations table to use.
	// Leave blank to use the default from https://github.com/golang-migrate/migrate.
	MigrationsTableName string `env:"MIGRATIONS_TABLE_NAME"`

	// MigrationsForceVersion gets a version to force the migrations to on startup.
	// Set to a non-positive number to skip forcing a version.
	MigrationsForceVersion int `env:"MIGRATIONS_FORCE_VERSION"`

	// BaseAssetsPath gets the base path to the client assets.
	BaseAssetsPath string `env:"BASE_ASSETS_PATH" default:"static"`

	// ImageQuality gets the quality level for recipe images.
	ImageQuality models.ImageQualityLevel `env:"IMAGE_QUALITY" default:"original"`

	// ImageSize gets the size of the bounding box to fit recipe images to. Ignored if ImageQuality == original.
	ImageSize int `env:"IMAGE_SIZE" default:"2000"`

	// ThumbnailQuality gets the quality level for the thumbnails of recipe images. Note that Original is not supported.
	ThumbnailQuality models.ImageQualityLevel `env:"THUMBNAIL_QUALITY" default:"medium"`

	// ThumbnailSize gets the size of the bounding box to fit the thumbnails recipe images to.
	ThumbnailSize int `env:"THUMBNAIL_SIZE" default:"500"`
}

const (
	defaultSecureKey = "ChangeMe"

	// Needed for backward compatibility
	sqliteLegacyDriverName = "sqlite3"
)

// Load reads the configuration file from the specified path
func Load(logInitializer func(*Config)) *Config {
	c := &Config{}
	c.loadFromEnv()

	// Now that we've loaded configuration, we can finish setting up logging
	logInitializer(c)

	// Special case for backward compatibility
	if c.DatabaseDriver == "" {
		slog.Debug("DATABASE_DRIVER is empty. Will attempt to infer...")
		if strings.HasPrefix(c.DatabaseURL, "file:") {
			slog.Debug("Setting DATABASE_DRIVER", "value", db.SQLiteDriverName)
			c.DatabaseDriver = db.SQLiteDriverName
		} else if strings.HasPrefix(c.DatabaseURL, "postgres:") {
			slog.Debug("Setting DATABASE_DRIVER", "value", db.PostgresDriverName)
			c.DatabaseDriver = db.PostgresDriverName
		} else {
			slog.Warn("Unable to infer a value for DATABASE_DRIVER; an error will likely follow")
		}
	} else if c.DatabaseDriver == sqliteLegacyDriverName {
		// If the old driver name for sqlite is being used,
		// we'll allow it and map it to the new one
		slog.Debug("Detected DATABASE_DRIVER legacy value '%s'. Setting to '%s'", sqliteLegacyDriverName, db.SQLiteDriverName)
		c.DatabaseDriver = db.SQLiteDriverName
	}

	logger := slog.
		With("port", c.Port,
			"upload-driver", c.UploadDriver,
			"upload-path", c.UploadPath,
			"is-development", c.IsDevelopment,
			"base-assets-path", c.BaseAssetsPath,
			"database-driver", c.DatabaseDriver,
			"migrations-table-name", c.MigrationsTableName,
			"migrations-force-version", c.MigrationsForceVersion,
			"image-quality", c.ImageQuality,
			"image-size", c.ImageSize,
			"thumbnail-quality", c.ThumbnailQuality,
			"thumbnail-size", c.ThumbnailSize)

	// Only print sensitive info in development mode
	if c.IsDevelopment {
		logger = logger.
			With("database-url", c.DatabaseURL,
				"secure-keys", c.SecureKeys)
	}

	logger.Info("Loaded configuration")

	return c
}

// Validate checks whether the current configuration settings are valid.
func (c *Config) Validate() []error {
	errs := make([]error, 0)

	if c.Port <= 0 {
		errs = append(errs, errors.New("PORT must be a positive integer"))
	}

	if c.UploadDriver != upload.FileSystemDriver && c.UploadDriver != upload.S3Driver {
		errs = append(errs, fmt.Errorf("UPLOAD_DRIVER must be one of ('%s', '%s')", upload.FileSystemDriver, upload.S3Driver))
	}

	if c.UploadPath == "" {
		errs = append(errs, errors.New("UPLOAD_PATH must be specified"))
	}

	if len(c.SecureKeys) == 0 {
		errs = append(errs, errors.New("SECURE_KEY must be specified with 1 or more keys separated by a comma"))
	} else if len(c.SecureKeys) == 1 && c.SecureKeys[0] == defaultSecureKey {
		slog.Warn("SECURE_KEY is set to the default value. It is highly recommended that this be changed to something unique.", slog.String("value", defaultSecureKey))
	}

	if c.BaseAssetsPath == "" {
		errs = append(errs, errors.New("BASE_ASSETS_PATH must be specified"))
	}

	if c.DatabaseDriver != db.PostgresDriverName && c.DatabaseDriver != db.SQLiteDriverName {
		errs = append(errs, fmt.Errorf("DATABASE_DRIVER must be one of ('%s', '%s')", db.PostgresDriverName, db.SQLiteDriverName))
	}

	if c.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL must be specified"))
	}

	if _, err := url.Parse(c.DatabaseURL); err != nil {
		errs = append(errs, errors.New("DATABASE_URL is invalid"))
	}

	if !c.ImageQuality.IsValid() {
		errs = append(errs, errors.New("IMAGE_QUALITY is invalid"))
	}

	if c.ImageSize <= 0 {
		errs = append(errs, errors.New("IMAGE_SIZE must be positive"))
	}

	if !c.ThumbnailQuality.IsValid() {
		errs = append(errs, errors.New("THUMBNAIL_QUALITY is invalid"))
	}

	if c.ThumbnailQuality == models.ImageQualityOriginal {
		errs = append(errs, fmt.Errorf("THUMBNAIL_QUALITY cannot be %s", models.ImageQualityOriginal))
	}

	if c.ThumbnailSize <= 0 {
		errs = append(errs, errors.New("THUMBNAIL_SIZE must be positive"))
	}

	return errs
}

// ToImageConfiguration converts the configuration to a models.ImageConfiguration
func (c Config) ToImageConfiguration() models.ImageConfiguration {
	return models.ImageConfiguration{
		ImageQuality:     c.ImageQuality,
		ImageSize:        c.ImageSize,
		ThumbnailQuality: c.ThumbnailQuality,
		ThumbnailSize:    c.ThumbnailSize,
	}
}

func (c *Config) loadFromEnv() {
	cVal := reflect.ValueOf(c).Elem()
	for i := 0; i < cVal.NumField(); i++ {
		field := cVal.Type().Field(i)
		val := cVal.Field(i)
		loadFieldFromEnv(field, val)
	}
}

func loadFieldFromEnv(field reflect.StructField, dest reflect.Value) {
	defaultStr := field.Tag.Get("default")

	envName, envOK := field.Tag.Lookup("env")
	if !envOK {
		panic(fmt.Errorf("missing environment variable name on configuration field %s", field.Name))
	}

	fullEnvName := "GOMP_" + envName
	// Try the application specific name (prefixed with GOMP_)...
	envStr, ok := os.LookupEnv(fullEnvName)
	// ... and only if not found, try the base name
	if ok {
		envName = fullEnvName
	} else {
		envStr, ok = os.LookupEnv(envName)
	}

	if !ok {
		if defaultStr == "" {
			return
		}

		envStr = defaultStr
	}

	switch dType := dest.Type(); {
	case dType == reflect.TypeFor[models.ImageQualityLevel]():
		val := getValue(field, envName, envStr, defaultStr, func(str string) (models.ImageQualityLevel, error) {
			return models.ImageQualityLevel(str), nil
		})
		dest.Set(reflect.ValueOf(val))
	case dType == reflect.TypeFor[[]string]():
		val := getValue(field, envName, envStr, defaultStr, func(str string) ([]string, error) {
			return strings.Split(str, ","), nil
		})
		dest.Set(reflect.ValueOf(val))
	case dType.Kind() == reflect.String:
		dest.SetString(envStr)
	case dType.Kind() == reflect.Int:
		val := getValue(field, envName, envStr, defaultStr, strconv.Atoi)
		dest.SetInt(int64(val))
	case dType.Kind() == reflect.Bool:
		val := getValue(field, envName, envStr, defaultStr, strconv.ParseBool)
		dest.SetBool(val)
	}
}

func getValue[T any](field reflect.StructField, envName, envStr, defaultStr string, convert func(string) (T, error)) T {
	val, err := convert(envStr)
	if err != nil {
		slog.Error("Failed to convert environment variable",
			"env", envName,
			"type", reflect.TypeFor[T](),
			"val", envStr,
			"error", err)
		if defaultStr != "" {
			val, err = convert(defaultStr)
			if err != nil {
				panic(fmt.Errorf("improperly defined default on configuration field %s", field.Name))
			}
		}
	}
	return val
}
