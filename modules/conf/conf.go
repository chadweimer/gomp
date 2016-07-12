package conf

import (
	"errors"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
)

// Config contains the application configuration settings
type Config struct {
	// RootURLPath gets just the path portion of the base application url.
	// E.g., if the app sits at http://www.example.com/path/to/gomp,
	// this setting would be "/path/to/gomp"
	RootURLPath string

	// Port gets the port number under which the site is being hosted.
	Port int

	// UploadDriver is used to select which backend data store is used for file uploads.
	// Available choises are: fs, s3
	UploadDriver string

	// UploadPath gets the path (full or relative) under which to store uploads.
	// When using Amazon S3, this should be set to the bucket name.
	UploadPath string

	// FaviconRootPath defines the path, relative to RootURLPath, under which the favicon
	// and other similar files are located. The following files should be included at this path:
	// * android-chrome-192x192.png (192x192)
	// * android-chrome-512x512.png (512x512)
	// * apple-touch-icon.png (180x180)
	// * favicon.ico
	// * favicon-32x32.png (32x32)
	// * favicon-16x16.png (16x16)
	// * mstile-150x150.png
	// * safari-pinned-tab.svg
	// * manifest.json
	// * browserconfig.xml
	FaviconRootPath string

	// IsDevelopment defines whether to run the application in "development mode".
	// Development mode turns on additional features, such as logging, that may
	// not be desirable in a production environment.
	IsDevelopment bool

	// SecretKey is used to keep data safe.
	SecretKey string

	// ApplicationTitle is used where the application name (title) is displayed on screen.
	ApplicationTitle string

	// HomeTitle is an optional heading displayed at the top of the gome screen.
	HomeTitle string

	// HomeImage is an optional heading image displayed beneath the HomeTitle.
	HomeImage string

	// DatabaseDriver gets which database/sql driver to use.
	// Supported drivers: sqlite3, postgres
	DatabaseDriver string

	// DatabaseUrl gets the url (or path, connection string, etc) to use with the associated
	// database driver when opening the database connection.
	DatabaseURL string
}

// Load reads the configuration file from the specified path
func Load(path string) *Config {
	c := Config{
		RootURLPath:      "",
		Port:             4000,
		UploadDriver:     "fs",
		UploadPath:       filepath.Join("data", "uploads"),
		FaviconRootPath:  "",
		IsDevelopment:    false,
		SecretKey:        "Secret123",
		ApplicationTitle: "GOMP: Go Meal Planner",
		HomeTitle:        "",
		HomeImage:        "",
		DatabaseDriver:   "sqlite3",
		DatabaseURL:      "sqlite3://data/gomp.db",
	}

	// If environment variables are set, use them.
	loadEnv("GOMP_ROOT_URL_PATH", &c.RootURLPath)
	loadEnv("PORT", &c.Port)
	loadEnv("GOMP_UPLOAD_DRIVER", &c.UploadDriver)
	loadEnv("GOMP_UPLOAD_PATH", &c.UploadPath)
	loadEnv("GOMP_FAVICON_ROOT_PATH", &c.FaviconRootPath)
	loadEnv("GOMP_IS_DEVELOPMENT", &c.IsDevelopment)
	loadEnv("GOMP_SECRET_KEY", &c.SecretKey)
	loadEnv("GOMP_APPLICATION_TITLE", &c.ApplicationTitle)
	loadEnv("GOMP_HOME_TITLE", &c.HomeTitle)
	loadEnv("GOMP_HOME_IMAGE", &c.HomeImage)
	loadEnv("DATABASE_DRIVER", &c.DatabaseDriver)
	loadEnv("DATABASE_URL", &c.DatabaseURL)

	if c.IsDevelopment {
		log.Printf("[config] RootUrlPath=%s", c.RootURLPath)
		log.Printf("[config] Port=%d", c.Port)
		log.Printf("[config] UploadDriver=%s", c.UploadDriver)
		log.Printf("[config] UploadPath=%s", c.UploadPath)
		log.Printf("[config] FaviconRootPath=%s", c.FaviconRootPath)
		log.Printf("[config] IsDevelopment=%t", c.IsDevelopment)
		log.Printf("[config] SecretKey=%s", c.SecretKey)
		log.Printf("[config] ApplicationTitle=%s", c.ApplicationTitle)
		log.Printf("[config] HomeTitle=%s", c.HomeTitle)
		log.Printf("[config] HomeImage=%s", c.HomeImage)
		log.Printf("[config] DatabaseDriver=%s", c.DatabaseDriver)
		log.Printf("[config] DatabaseURL=%s", c.DatabaseURL)
	}

	return &c
}

// Validate checks whether the current configuration settings are valid.
func (c *Config) Validate() error {
	_, err := url.Parse(c.RootURLPath)
	if err != nil {
		return errors.New("GOMP_ROOT_URL_PATH is invalid")
	}

	if c.Port <= 0 {
		return errors.New("PORT must be a positive integer")
	}

	if c.UploadDriver != "fs" && c.UploadDriver != "s3" {
		return errors.New("UPLOAD_DRIVER must be one of ('fs', 's3')")
	}

	if c.UploadPath == "" {
		return errors.New("UPLOAD_PATH must be specified")
	}

	if c.SecretKey == "" {
		return errors.New("GOMP_SECRET_KEY must be specified")
	}

	if c.ApplicationTitle == "" {
		return errors.New("GOMP_APPLICATION_TITLE must be specified")
	}

	if c.DatabaseDriver != "sqlite3" && c.DatabaseDriver != "postgres" {
		return errors.New("DATABASE_DRIVER must be one of ('sqlite3', 'postgres')")
	}

	_, err = url.Parse(c.DatabaseURL)
	if err != nil {
		return errors.New("DATABASE_URL is invalid")
	}

	return nil
}

func loadEnv(name string, dest interface{}) {
	var err error
	if envStr := os.Getenv(name); envStr != "" {
		switch dest := dest.(type) {
		case *string:
			*dest = envStr
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
