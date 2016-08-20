package conf

import (
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
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

	// SecretKey is used for session authentication. Recommended to be 32 or 64 ASCII characters.
	SecretKey string

	// ApplicationTitle is used where the application name (title) is displayed on screen.
	ApplicationTitle string

	// HomeTitle is an optional heading displayed at the top of the gome screen.
	HomeTitle string

	// HomeImage is an optional heading image displayed beneath the HomeTitle.
	HomeImage string

	// DatabaseDriver gets which database/sql driver to use.
	// Supported drivers: postgres
	DatabaseDriver string

	// DatabaseUrl gets the url (or path, connection string, etc) to use with the associated
	// database driver when opening the database connection.
	DatabaseURL string
}

var logger = log.New(os.Stdout, "[conf] ", 0)

// Load reads environment variables into strongly-typed properties
func Load() *Config {
	c := Config{
		Port:             4000,
		UploadDriver:     "fs",
		UploadPath:       filepath.Join("data", "uploads"),
		IsDevelopment:    false,
		SecretKey:        "Secret123",
		ApplicationTitle: "GOMP: Go Meal Planner",
		HomeTitle:        "",
		HomeImage:        "",
		DatabaseDriver:   "postgres",
		DatabaseURL:      "",
	}

	// If environment variables are set, use them.
	loadEnv("PORT", &c.Port)
	loadEnv("GOMP_UPLOAD_DRIVER", &c.UploadDriver)
	loadEnv("GOMP_UPLOAD_PATH", &c.UploadPath)
	loadEnv("GOMP_IS_DEVELOPMENT", &c.IsDevelopment)
	loadEnv("GOMP_SECRET_KEY", &c.SecretKey)
	loadEnv("GOMP_APPLICATION_TITLE", &c.ApplicationTitle)
	loadEnv("GOMP_HOME_TITLE", &c.HomeTitle)
	loadEnv("GOMP_HOME_IMAGE", &c.HomeImage)
	loadEnv("DATABASE_DRIVER", &c.DatabaseDriver)
	loadEnv("DATABASE_URL", &c.DatabaseURL)

	if c.IsDevelopment {
		logger.Printf("Port=%d", c.Port)
		logger.Printf("UploadDriver=%s", c.UploadDriver)
		logger.Printf("UploadPath=%s", c.UploadPath)
		logger.Printf("IsDevelopment=%t", c.IsDevelopment)
		logger.Printf("SecretKey=%s", c.SecretKey)
		logger.Printf("ApplicationTitle=%s", c.ApplicationTitle)
		logger.Printf("HomeTitle=%s", c.HomeTitle)
		logger.Printf("HomeImage=%s", c.HomeImage)
		logger.Printf("DatabaseDriver=%s", c.DatabaseDriver)
		logger.Printf("DatabaseURL=%s", c.DatabaseURL)
	}

	c.validate()

	return &c
}

func (c *Config) validate() {
	if c.Port <= 0 {
		logger.Fatal("PORT must be a positive integer")
	}

	if c.UploadDriver != "fs" && c.UploadDriver != "s3" {
		logger.Fatal("UPLOAD_DRIVER must be one of ('fs', 's3')")
	}

	if c.UploadPath == "" {
		logger.Fatal("UPLOAD_PATH must be specified")
	}

	if c.SecretKey == "" {
		logger.Fatal("GOMP_SECRET_KEY must be specified")
	}

	if c.ApplicationTitle == "" {
		logger.Fatal("GOMP_APPLICATION_TITLE must be specified")
	}

	if c.DatabaseDriver != "postgres" {
		logger.Fatal("DATABASE_DRIVER must be one of ('postgres')")
	}

	if c.DatabaseURL == "" {
		logger.Fatal("DATABASE_URL must be specified")
	}

	if _, err := url.Parse(c.DatabaseURL); err != nil {
		logger.Fatal("DATABASE_URL is invalid")
	}
}

func loadEnv(name string, dest interface{}) {
	var err error
	if envStr := os.Getenv(name); envStr != "" {
		switch dest := dest.(type) {
		case *string:
			*dest = envStr
		case *int:
			if *dest, err = strconv.Atoi(envStr); err != nil {
				log.Fatalf("Failed to convert %s environment variable to an integer. Value = %s, Error = %s",
					name, envStr, err)
			}
		case *bool:
			*dest = envStr != "0"
		}
	}
}
