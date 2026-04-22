package main

import (
	"errors"
	"fmt"
	"log/slog"
	"net"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
)

const defaultSecureKey = "ChangeMe"

// Config represents the application configuration settings
type Config struct {
	// FileAccess contains the file access configuration settings
	FileAccess fileaccess.Config

	// Database contains the database configuration settings
	Database db.Config

	// Port gets the port number under which the site is being hosted.
	Port int `env:"PORT" default:"5000"`

	// IsDevelopment defines whether to run the application in "development mode".
	// Development mode turns on additional features, such as logging, that may
	// not be desirable in a production environment.
	IsDevelopment bool `env:"IS_DEVELOPMENT" default:"false"`

	// BaseAssetsPath gets the base path to the client assets.
	BaseAssetsPath string `env:"BASE_ASSETS_PATH" default:"static"`

	// SecureKeys is used for session authentication. Recommended to be 32 or 64 ASCII characters.
	// Multiple keys can be separated by commas.
	SecureKeys []string `env:"SECURE_KEY" default:"ChangeMe"`

	// TrustedProxies is a list of IP addresses or CIDR ranges that are considered trusted proxies.
	// When determining the client IP address, if the request comes from a trusted proxy,
	// the X-Forwarded-For header will be used to determine the original client IP.
	TrustedProxies []string `env:"TRUSTED_PROXIES" default:""`
}

func (c Config) validate() error {
	errs := make([]error, 0)

	if c.Port <= 0 {
		errs = append(errs, errors.New("port must be a positive integer"))
	}

	if c.BaseAssetsPath == "" {
		errs = append(errs, errors.New("base assets path must be specified"))
	}

	if len(c.SecureKeys) == 0 {
		errs = append(errs, errors.New("secure keys must be specified with 1 or more keys separated by a comma"))
	} else if len(c.SecureKeys) == 1 && c.SecureKeys[0] == defaultSecureKey {
		slog.Warn("Using default secure key. It is highly recommended that this be changed to something unique.", slog.String("value", defaultSecureKey))
	}

	if _, err := c.parseTrustedProxies(); err != nil {
		errs = append(errs, fmt.Errorf("invalid trusted proxies: %w", err))
	}

	return errors.Join(errs...)
}

// getTrustedProxies returns the list of trusted proxies as a slice of net.IPNet.
// It is expected that the trusted proxies will be validated and parsed successfully by the validate method before this is called,
// so any errors during parsing will result in a panic.
func (c Config) getTrustedProxies() []net.IPNet {
	proxies, err := c.parseTrustedProxies()
	if err != nil {
		panic(err)
	}
	return proxies
}

func (c Config) parseTrustedProxies() ([]net.IPNet, error) {
	proxies := make([]net.IPNet, len(c.TrustedProxies))
	for i, proxy := range c.TrustedProxies {
		// First check if it's a single IP address, and if so, convert it to a CIDR with a full mask
		if ip := net.ParseIP(proxy); ip != nil {
			mask := net.CIDRMask(len(ip)*8, len(ip)*8)
			ipNet := net.IPNet{
				IP:   ip,
				Mask: mask,
			}
			proxies[i] = ipNet
		} else {
			// If it's not a single IP, try to parse it as a CIDR
			_, ipNet, err := net.ParseCIDR(proxy)
			if err != nil {
				return nil, err
			}
			proxies[i] = *ipNet
		}
	}

	return proxies, nil
}
