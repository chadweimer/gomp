package conf

import (
	"log"
	"net/url"
	"os"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	RootURL  string `mapstructure:"root_url"`
	Port     int    `mapstructure:"port"`
	DataPath string `mapstructure:"data_path"`
}

var C Config

// Load reads the configuration file from disk, if present
func init() {
	viper.SetDefault("root_url", "http://localhost:4000/")
	viper.SetDefault("port", 4000)
	viper.SetDefault("data_path", "data")

	viper.SetConfigName("app")
	viper.AddConfigPath("./conf")
	viper.SetConfigType("json")

	err := viper.ReadInConfig()
	if err != nil && !os.IsNotExist(err) {
		log.Fatal("Failed to read in app.json", err)
	}

	err = viper.Unmarshal(&C)
	if err != nil {
		log.Fatal("Failed to marshal configuration settings", err)
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
