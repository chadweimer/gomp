package conf

import (
	"encoding/json"
	"errors"
	"io/ioutil"
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
	RootURLPath string `json:"root_url_path"`

	// Port gets the port number under which the site is being hosted.
	Port int `json:"port"`

	// UploadDriver is used to select which backend data store is used for file uploads.
	// Available choises are: fs, s3
	UploadDriver string `json:"upload_driver"`

	// UploadPath gets the path (full or relative) under which to store uploads.
	// When using Amazon S3, this should be set to the bucket name.
	UploadPath string `json:"upload_path"`

	// IsDevelopment defines whether to run the application in "development mode".
	// Development mode turns on additional features, such as logging, that may
	// not be desirable in a production environment.
	IsDevelopment bool `json:"is_development"`

	// SecretKey is used to keep data safe.
	SecretKey string `json:"secret_key"`

	// ApplicationTitle is used where the application name (title) is displayed on screen.
	ApplicationTitle string `json:"application_title"`

	// DatabaseDriver gets which database/sql driver to use.
	// Supported drivers: sqlite3, postgres
	DatabaseDriver string `json:"database_driver"`

	// DatabaseUrl gets the url (or path, connection string, etc) to use with the associated
	// database driver when opening the database connection.
	DatabaseURL string `json:"database_url"`

	// AwsRegion defines the region to use for the S3 upload driver.
	AwsRegion string `json:"aws_region"`

	// AwsAccessKeyID defines the Access Key to use for S3 upload driver.
	AwsAccessKeyID string `json:"aws_access_key_id"`

	// AwsRegion defines the Secret Access Key to use for the S3 upload driver.
	AwsSecretAccessKey string `json:"aws_secret_access_key"`
}

// Load reads the configuration file from the specified path
func Load(path string) *Config {
	c := Config{
		RootURLPath:      "",
		Port:             4000,
		UploadDriver:     "fs",
		UploadPath:       filepath.Join("data", "uploads"),
		IsDevelopment:    false,
		SecretKey:        "Secret123",
		ApplicationTitle: "GOMP: Go Meal Planner",
		DatabaseDriver:   "sqlite3",
		DatabaseURL:      "sqlite3://data/gomp.db",
	}

	// If environment variables are set, use them.
	loadEnv("GOMP_ROOT_URL_PATH").fillString(&c.RootURLPath)
	loadEnv("PORT").fillInt(&c.Port)
	loadEnv("GOMP_UPLOAD_DRIVER").fillString(&c.UploadDriver)
	loadEnv("GOMP_UPLOAD_PATH").fillString(&c.UploadPath)
	loadEnv("GOMP_IS_DEVELOPMENT").fillBool(&c.IsDevelopment)
	loadEnv("GOMP_SECRET_KEY").fillString(&c.SecretKey)
	loadEnv("GOMP_APPLICATION_TITLE").fillString(&c.ApplicationTitle)
	loadEnv("DATABASE_DRIVER").fillString(&c.DatabaseDriver)
	loadEnv("DATABASE_URL").fillString(&c.DatabaseURL)

	// If a config file exists, use it and override anything that came from environment variables
	file, err := ioutil.ReadFile(path)
	if err == nil {
		err = json.Unmarshal(file, &c)
		if err != nil {
			log.Fatalf("Failed to marshal configuration settings. Error = %s", err)
		}
	} else if !os.IsNotExist(err) {
		log.Fatalf("Failed to read in app.json. Error = %s", err)
	}

	if c.IsDevelopment {
		log.Printf("[config] RootUrlPath=%s", c.RootURLPath)
		log.Printf("[config] Port=%d", c.Port)
		log.Printf("[config] UploadDriver=%s", c.UploadDriver)
		log.Printf("[config] UploadPath=%s", c.UploadPath)
		log.Printf("[config] IsDevelopment=%t", c.IsDevelopment)
		log.Printf("[config] SecretKey=%s", c.SecretKey)
		log.Printf("[config] ApplicationTitle=%s", c.ApplicationTitle)
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

	if c.DatabaseDriver != "sqlite3" && c.UploadDriver != "postgres" {
		return errors.New("DATABASE_DRIVER must be one of ('sqlite3', 'postgres')")
	}

	_, err = url.Parse(c.DatabaseURL)
	if err != nil {
		return errors.New("DATABASE_URL is invalid")
	}

	return nil
}

type environmentVar struct {
	Name  string
	Value string
	IsSet bool
}

func loadEnv(name string) *environmentVar {
	if envStr := os.Getenv(name); envStr != "" {
		return &environmentVar{Name: name, Value: envStr, IsSet: true}
	}

	return &environmentVar{Name: name, IsSet: false}
}

func (e *environmentVar) fillString(value *string) {
	if e.IsSet {
		*value = e.Value
	}
}

func (e *environmentVar) fillInt(value *int) {
	if e.IsSet {
		var err error
		*value, err = strconv.Atoi(e.Value)
		if err != nil {
			log.Fatalf("[config] Failed to convert %s environment variable to an integer. Value = %s, Error = %s",
				e.Name, e.Value, err)
		}
	}
}

func (e *environmentVar) fillBool(value *bool) {
	if e.IsSet {
		*value = e.Value != "0"
	}
}
