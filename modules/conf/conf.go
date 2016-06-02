package conf

import (
	"encoding/json"
	"io/ioutil"
	"log"
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

	// UploadPath gets the path (full or relative) under which to store uploads.
	UploadPath string `json:"upload_path"`

	// IsDevelopment defines whether to run the application in "development mode".
	// Development mode turns on additional features, such as logging, that may
	// not be desirable in a production environment.
	IsDevelopment bool `json:"is_development"`

	// SecretKey is used to keep data safe.
	SecretKey string `json:"secret_key"`

	// ApplicationTitle is used where the application name (title) is displayed on screen.
	ApplicationTitle string `json:"application_title"`

	DatabaseDriver string `json:"database_driver"`
	DatabaseURL    string `json:"database_url"`
}

// Load reads the configuration file from the specified path
func Load(path string) *Config {
	c := Config{
		RootURLPath:      "",
		Port:             4000,
		UploadPath:       filepath.Join("data", "uploads"),
		IsDevelopment:    false,
		SecretKey:        "Secret123",
		ApplicationTitle: "GOMP: Go Meal Planner",
		DatabaseDriver:   "sqlite3",
		DatabaseURL:      filepath.Join("data", "gomp.db"),
	}

	// If environment variables are set, use them.
	if envStr := os.Getenv("GOMP_ROOT_URL_PATH"); envStr != "" {
		c.RootURLPath = envStr
	}
	if envStr := os.Getenv("PORT"); envStr != "" {
		var err error
		c.Port, err = strconv.Atoi(envStr)
		if err != nil {
			log.Fatalf("Failed to convert PORT environment variable. Error = %s", err)
		}
	}
	if envStr := os.Getenv("GOMP_UPLOAD_PATH"); envStr != "" {
		c.UploadPath = envStr
	}
	if envStr := os.Getenv("GOMP_IS_DEVELOPMENT"); envStr != "" {
		c.IsDevelopment = envStr != "0"
	}
	if envStr := os.Getenv("GOMP_SECRET_KEY"); envStr != "" {
		c.SecretKey = envStr
	}
	if envStr := os.Getenv("GOMP_APPLICATION_TITLE"); envStr != "" {
		c.ApplicationTitle = envStr
	}
	if envStr := os.Getenv("DATABASE_DRIVER"); envStr != "" {
		c.DatabaseDriver = envStr
	}
	if envStr := os.Getenv("DATABASE_URL"); envStr != "" {
		c.DatabaseURL = envStr
	}

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
		log.Printf("[config] UploadPath=%s", c.UploadPath)
		log.Printf("[config] IsDevelopment=%t", c.IsDevelopment)
		log.Printf("[config] SecretKey=%s", c.SecretKey)
		log.Printf("[config] ApplicationTitle=%s", c.ApplicationTitle)
		log.Printf("[config] DbDriver=%s", c.DbDriver)
		log.Printf("[config] DbConnectionString=%s", c.DbConnectionString)
	}

	return &c
}
