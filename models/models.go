package models

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen --config cfg.yaml ../models.yaml

// ImageQualityLevel represents supported quality levels for uploaded recipe images
type ImageQualityLevel string

const (
	// ImageQualityOriginal saves the original file as uploaded
	ImageQualityOriginal ImageQualityLevel = "original"

	// ImageQualityHigh saves the file with high JPEG quality
	ImageQualityHigh ImageQualityLevel = "high"

	// ImageQualityMedium saves the file with moderate JPEG quality
	ImageQualityMedium ImageQualityLevel = "medium"

	// ImageQualityLow saves the file with low JPEG quality
	ImageQualityLow ImageQualityLevel = "low"
)

// IsValid checks if the value of the ImageQualityLevel is one of the supported values
func (q ImageQualityLevel) IsValid() bool {
	switch q {
	case ImageQualityOriginal, ImageQualityHigh, ImageQualityMedium, ImageQualityLow:
		return true
	}

	return false
}

// ImageConfiguration represents the set of configuration supported for recipe images
type ImageConfiguration struct {
	// ImageQuality gets the quality level for recipe images.
	ImageQuality ImageQualityLevel

	// ImageSize gets the size of the bounding box to fit recipe images to. Ignored if ImageQuality == original.
	ImageSize int

	// ThumbnailQuality gets the quality level for the thumbnails of recipe images. Note that Original is not supported.
	ThumbnailQuality ImageQualityLevel

	// ThumbnailSize gets the size of the bounding box to fit the thumbnails recipe images to.
	ThumbnailSize int
}
