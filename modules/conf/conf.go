package conf

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"os"
	"strconv"
)

type Config struct {
	// RootURLPath gets just the path portion of the base application url.
	// E.g., if the app sits at http://www.example.com/path/to/gomp,
	// this setting would be "/path/to/gomp"
	RootURLPath string `json:"root_url_path"`

	// Port gets the port number under which the site is being hosted.
	Port int `json:"port"`

	// DataPath gets the path (full or relative) under which to store the database
	// and other runtime date (e.g., uploaded images).
	DataPath string `json:"data_path"`

	// IsDevelopment defines whether to run the application in "development mode".
	// Development mode turns on additional features, such as logging, that may
	// not be desirable in a production environment.
	IsDevelopment bool `json:"is_development"`

	// SecretKey is used to keep data safe.
	SecretKey string `json:"secret_key"`
}

// Load reads the configuration file from the specified path
func Load(path string) *Config {
	c := Config{
		RootURLPath:   "",
		Port:          4000,
		DataPath:      "data",
		IsDevelopment: false,
		SecretKey:     "Secret123",
	}

	// If the PORT environment variable is set, use it.
	if portStr := os.Getenv("PORT"); portStr != "" {
		var err error
		c.Port, err = strconv.Atoi(portStr)
		if err != nil {
			log.Fatalf("Failed to marshal configuration settings. Error = %s", err)
		}
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

	return &c
}
