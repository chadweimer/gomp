package conf

import "github.com/spf13/viper"

type Config struct {
	RootURL  string
	Port     uint
	DataPath string
}

var C Config

func (c *Config) Load() error {
	viper.SetDefault("RootUrl", "http://localhost:4000/")
	viper.SetDefault("Port", 4000)
	viper.SetDefault("DataPath", "data")

	viper.SetConfigName("app")
	viper.AddConfigPath("conf")
	viper.SetConfigType("json")

	return viper.Unmarshal(&C)
}

