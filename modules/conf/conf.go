package conf

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/url"
	"os"
	"strings"
)

type Config struct {
	// RootURL gets the URL of the root of the site (e.g., http://localhost/gomp).
	RootURL string `json:"root_url"`

	// RootURLPath gets just the path portion of the RootUrl value,
	// without any trailing slashes.
	RootURLPath string `json:"-"`

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
		RootURL:       "http://localhost:4000/",
		Port:          4000,
		DataPath:      "data",
		IsDevelopment: false,
		SecretKey:     "Secret123",
	}

	file, err := ioutil.ReadFile(path)
	if err == nil {
		err = json.Unmarshal(file, &c)
		if err != nil {
			log.Fatalf("Failed to marshal configuration settings. Error = %s", err)
		}
	} else if !os.IsNotExist(err) {
		log.Fatalf("Failed to read in app.json. Error = %s", err)
	}

	// Check if root url has a sub-path
	url, err := url.Parse(c.RootURL)
	if err != nil {
		log.Fatal("Invalid root_url")
	}
	c.RootURLPath = strings.TrimSuffix(url.Path, "/")

	return &c
}
