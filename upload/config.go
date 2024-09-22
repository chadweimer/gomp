package upload

import (
	"errors"
	"fmt"
)

// Config represents the upload configuration settings
type Config struct {
	// DriverConfig contains the configuration settings for upload drivers
	Driver DriverConfig

	// ImageConfig contains the set of configuration supported for recipe images
	Image ImageConfig
}

// DriverConfig represents the configuration settings for upload drivers
type DriverConfig struct {
	// Driver is used to select which backend data store is used for file uploads.
	// Supported drivers: fs, s3
	Driver string `env:"UPLOAD_DRIVER" default:"fs"`

	// Path gets the path (full or relative) under which to store uploads.
	// When using Amazon S3, this should be set to the bucket name.
	Path string `env:"UPLOAD_PATH" default:"data/uploads"`
}

func (c DriverConfig) validate() error {
	errs := make([]error, 0)

	if c.Driver != FileSystemDriver && c.Driver != S3Driver {
		errs = append(errs, fmt.Errorf("driver must be one of ('%s', '%s')", FileSystemDriver, S3Driver))
	}

	if c.Path == "" {
		errs = append(errs, errors.New("path must be specified"))
	}

	return errors.Join(errs...)
}

// ImageConfig represents the set of configuration supported for recipe images
type ImageConfig struct {

	// ImageQuality gets the quality level for recipe images.
	ImageQuality ImageQualityLevel `env:"IMAGE_QUALITY" default:"original"`

	// ImageSize gets the size of the bounding box to fit recipe images to. Ignored if ImageQuality == original.
	ImageSize int `env:"IMAGE_SIZE" default:"2000"`

	// ThumbnailQuality gets the quality level for the thumbnails of recipe images. Note that Original is not supported.
	ThumbnailQuality ImageQualityLevel `env:"THUMBNAIL_QUALITY" default:"medium"`

	// ThumbnailSize gets the size of the bounding box to fit the thumbnails recipe images to.
	ThumbnailSize int `env:"THUMBNAIL_SIZE" default:"500"`
}

func (cfg ImageConfig) validate() error {
	errs := make([]error, 0)

	if !cfg.ImageQuality.IsValid() {
		errs = append(errs, errors.New("image quality is invalid"))
	}

	if cfg.ImageSize <= 0 {
		errs = append(errs, errors.New("image size must be positive"))
	}

	if !cfg.ThumbnailQuality.IsValid() {
		errs = append(errs, errors.New("thumbnail quality is invalid"))
	}

	if cfg.ThumbnailQuality == ImageQualityOriginal {
		errs = append(errs, fmt.Errorf("thumbnail quality cannot be %s", ImageQualityOriginal))
	}

	if cfg.ThumbnailSize <= 0 {
		errs = append(errs, errors.New("thumbnail size must be positive"))
	}

	return errors.Join(errs...)
}
