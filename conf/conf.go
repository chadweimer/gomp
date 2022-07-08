package conf

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
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

	// DatabaseDriver gets which database/sql driver to use.
	// Supported drivers: postgres, sqlite3
	DatabaseDriver string

	// DatabaseUrl gets the url (or path, connection string, etc) to use with the associated
	// database driver when opening the database connection.
	DatabaseUrl string

	// MigrationsTableName gets the name of the database migrations table to use.
	// Leave blank to use the default from https://github.com/golang-migrate/migrate.
	MigrationsTableName string

	// MigrationsForceVersion gets a version to force the migrations to on startup.
	// Set to a negative number to skip forcing a version.
	MigrationsForceVersion int

	// BaseAssetsPath gets the base path to the client assets.
	BaseAssetsPath string

	// ImageQuality gets the quality level for recipe images.
	ImageQuality models.ImageQualityLevel

	// ImageSize gets the size of the bounding box to fit recipe images to. Ignored if ImageQuality == original.
	ImageSize int

	// ThumbnailQuality gets the quality level for the thumbnails of recipe images. Note that Original is not supported.
	ThumbnailQuality models.ImageQualityLevel

	// ThumnbailSize gets the size of the bounding box to fit the thumbnails recipe images to.
	ThumnbailSize int
}

const (
	defaultSecureKey = "ChangeMe"

	// Needed for backward compatibility
	sqliteLegacyDriverName = "sqlite3"
)

// Load reads the configuration file from the specified path
func Load() *Config {
	c := Config{
		Port:                   5000,
		UploadDriver:           "fs",
		UploadPath:             filepath.Join("data", "uploads"),
		IsDevelopment:          false,
		SecureKeys:             []string{defaultSecureKey},
		DatabaseDriver:         "",
		DatabaseUrl:            "file:" + filepath.Join("data", "data.db") + "?_pragma=foreign_keys(1)",
		MigrationsTableName:    "",
		MigrationsForceVersion: -1,
		BaseAssetsPath:         "static",
		ImageQuality:           models.ImageQualityOriginal,
		ImageSize:              2000,
		ThumbnailQuality:       models.ImageQualityMedium,
		ThumnbailSize:          500,
	}

	// If environment variables are set, use them.
	loadEnv("BASE_ASSETS_PATH", &c.BaseAssetsPath)
	loadEnv("IS_DEVELOPMENT", &c.IsDevelopment)
	loadEnv("MIGRATIONS_TABLE_NAME", &c.MigrationsTableName)
	loadEnv("MIGRATIONS_FORCE_VERSION", &c.MigrationsForceVersion)
	loadEnv("UPLOAD_DRIVER", &c.UploadDriver)
	loadEnv("UPLOAD_PATH", &c.UploadPath)
	loadEnv("DATABASE_DRIVER", &c.DatabaseDriver)
	loadEnv("DATABASE_URL", &c.DatabaseUrl)
	loadEnv("PORT", &c.Port)
	loadEnv("SECURE_KEY", &c.SecureKeys)
	loadEnv("IMAGE_QUALITY", &c.ImageQuality)
	loadEnv("IMAGE_Size", &c.ImageSize)
	loadEnv("THUMBNAIL_QUALITY", &c.ThumbnailQuality)
	loadEnv("THUMBNAIL_Size", &c.ThumnbailSize)

	// Now that we've loaded configuration, we can finish setting up logging
	if !c.IsDevelopment {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
		log.Logger = log.Level(zerolog.InfoLevel)
	}

	// Special case for backward compatibility
	if c.DatabaseDriver == "" {
		log.Debug().Msg("DATABASE_DRIVER is empty. Will attempt to infer...")
		if strings.HasPrefix(c.DatabaseUrl, "file:") {
			log.Debug().Msgf("Setting DATABASE_DRIVER to '%s'", db.SQLiteDriverName)
			c.DatabaseDriver = db.SQLiteDriverName
		} else if strings.HasPrefix(c.DatabaseUrl, "postgres:") {
			log.Debug().Msgf("Setting DATABASE_DRIVER to '%s'", db.PostgresDriverName)
			c.DatabaseDriver = db.PostgresDriverName
		} else {
			log.Warn().Msg("Unable to infer a value for DATABASE_DRIVER; an error will likely follow")
		}
	} else if c.DatabaseDriver == sqliteLegacyDriverName {
		// If the old driver name for sqlite is being used,
		// we'll allow it and map it to the new one
		log.Debug().Msgf("Detected DATABASE_DRIVER legacy value '%s'. Setting to '%s'", sqliteLegacyDriverName, db.SQLiteDriverName)
		c.DatabaseDriver = db.SQLiteDriverName
	}

	logCtx := log.Info().
		Int("port", c.Port).
		Str("upload-driver", c.UploadDriver).
		Str("upload-path", c.UploadPath).
		Bool("is-development", c.IsDevelopment).
		Str("base-assets-path", c.BaseAssetsPath).
		Str("database-driver", c.DatabaseDriver).
		Str("migrations-table-name", c.MigrationsTableName).
		Int("migrations-force-version", c.MigrationsForceVersion).
		Str("image-quality", string(c.ImageQuality)).
		Int("image-size", c.ImageSize).
		Str("thumbnail-quality", string(c.ThumbnailQuality)).
		Int("thumbnail-size", c.ThumnbailSize)

	// Only print sensitive info in development mode
	if c.IsDevelopment {
		keyArr := zerolog.Arr()
		for _, key := range c.SecureKeys {
			keyArr.Str(key)
		}
		logCtx = logCtx.
			Str("database-url", c.DatabaseUrl). // This may contain auth information
			Array("secure-keys", keyArr)
	}

	logCtx.Msg("")

	return &c
}

// Validate checks whether the current configuration settings are valid.
func (c *Config) Validate() error {
	if c.Port <= 0 {
		return errors.New("PORT must be a positive integer")
	}

	if c.UploadDriver != upload.FileSystemDriver && c.UploadDriver != upload.S3Driver {
		return fmt.Errorf("UPLOAD_DRIVER must be one of ('%s', '%s')", upload.FileSystemDriver, upload.S3Driver)
	}

	if c.UploadPath == "" {
		return errors.New("UPLOAD_PATH must be specified")
	}

	if c.SecureKeys == nil || len(c.SecureKeys) < 1 {
		return errors.New("SECURE_KEY must be specified with 1 or more keys separated by a comma")
	} else if len(c.SecureKeys) == 1 && c.SecureKeys[0] == defaultSecureKey {
		log.Warn().Msgf("SECURE_KEY is set to the default value '%s'. It is highly recommended that this be changed to something unique.", defaultSecureKey)
	}

	if c.BaseAssetsPath == "" {
		return errors.New("BASE_ASSETS_PATH must be specified")
	}

	if c.DatabaseDriver != db.PostgresDriverName && c.DatabaseDriver != db.SQLiteDriverName {
		return fmt.Errorf("DATABASE_DRIVER must be one of ('%s', '%s')", db.PostgresDriverName, db.SQLiteDriverName)
	}

	if c.DatabaseUrl == "" {
		return errors.New("DATABASE_URL must be specified")
	}

	if _, err := url.Parse(c.DatabaseUrl); err != nil {
		return errors.New("DATABASE_URL is invalid")
	}

	if !c.ImageQuality.IsValid() {
		return errors.New("IMAGE_QUALITY is invalid")
	}

	if c.ImageSize <= 0 {
		return errors.New("IMAGE_SIZE must be positive")
	}

	if !c.ThumbnailQuality.IsValid() || c.ThumbnailQuality == models.ImageQualityOriginal {
		return errors.New("THUMBNAIL_QUALITY is invalid")
	}

	if c.ThumnbailSize <= 0 {
		return errors.New("THUMBNAIL_SIZE must be positive")
	}

	return nil
}

// ToImageConfiguration converts the configuration to a models.ImageConfiguration
func (c Config) ToImageConfiguration() models.ImageConfiguration {
	return models.ImageConfiguration{
		ImageQuality:     c.ImageQuality,
		ImageSize:        c.ImageSize,
		ThumbnailQuality: c.ThumbnailQuality,
		ThumnbailSize:    c.ThumnbailSize,
	}
}

func loadEnv(name string, dest interface{}) {
	fullName := "GOMP_" + name
	// Try the application specific name (prefixed with GOMP_)...
	envStr, ok := os.LookupEnv(fullName)
	// ... and only if not found, try the base name
	if ok {
		name = fullName
	} else {
		envStr, ok = os.LookupEnv(name)
	}

	if ok {
		switch dest := dest.(type) {
		case *string:
			*dest = envStr
		case *models.ImageQualityLevel:
			*dest = models.ImageQualityLevel(envStr)
		case *[]string:
			*dest = strings.Split(envStr, ",")
		case *int:
			val, err := strconv.Atoi(envStr)
			if err != nil {
				log.Err(err).
					Str("env", name).
					Str("val", envStr).
					Msg("Failed to convert environment variable to an integer")
			} else {
				*dest = val
			}
		case *bool:
			*dest = envStr != "0"
		}
	}
}
