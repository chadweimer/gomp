package conf

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/url"
	"os"
	"strings"
)

// Config encapsules all the configuration settings available to the application
type Config struct {
	RootURL  string `json:"root_url"`
	Port     int    `json:"port"`
	DataPath string `json:"data_path"`
}

// C is an instance of Config that holds the values read from the configuration
// file on disk, or default values.
var C = Config{
	RootURL:  "http://localhost:4000/",
	Port:     4000,
	DataPath: "data",
}

func init() {
	file, err := ioutil.ReadFile("conf/app.json")
	if err != nil && !os.IsNotExist(err) {
		return
	} else if err != nil {
		log.Fatalf("Failed to read in app.json. Error = %s", err)
	}

	err = json.Unmarshal(file, &C)
	if err != nil {
		log.Fatalf("Failed to marshal configuration settings. Error = %s", err)
	}
}

// GetRootURLPath returns just the path portion of the RootUrl value,
// without any trailing slashes.
func (c *Config) GetRootURLPath() string {
	// Check if root url has a sub-path
	url, err := url.Parse(c.RootURL)
	if err != nil {
		panic("Invalid root_url")
	}
	return strings.TrimSuffix(url.Path, "/")
}
