package conf

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/url"
	"os"
	"strings"
)

type config struct {
	RootURL     string `json:"root_url"`
	RootURLPath string `json:"-"`
	Port        int    `json:"port"`
	DataPath    string `json:"data_path"`
}

var c = config{
	RootURL:  "http://localhost:4000/",
	Port:     4000,
	DataPath: "data",
}

func init() {
	file, err := ioutil.ReadFile("conf/app.json")
	if err == nil {
		err = json.Unmarshal(file, &c)
		if err != nil {
			log.Fatalf("Failed to marshal configuration settings. Error = %s", err)
		}
	} else if !os.IsNotExist(err) {
		log.Fatalf("Failed to read in app.json. Error = %s", err)
		return
	}

	// Check if root url has a sub-path
	url, err := url.Parse(c.RootURL)
	if err != nil {
		log.Fatal("Invalid root_url")
	}
	c.RootURLPath = strings.TrimSuffix(url.Path, "/")
}

// RootURL gets the URL of the root of the site (e.g., http://localhost/gomp).
func RootURL() string {
	return c.RootURL
}

// Port gets the port number under which the site is being hosted.
func Port() int {
	return c.Port
}

// DataPath gets the path (full or relative) under which to store the database
// and other runtime date (e.g., uploaded images).
func DataPath() string {
	return c.DataPath
}

// RootURLPath gets just the path portion of the RootUrl value,
// without any trailing slashes.
func RootURLPath() string {
	return c.RootURLPath
}
