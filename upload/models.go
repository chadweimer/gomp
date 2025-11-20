package upload

// ImageQualityLevel represents supported quality levels for uploaded recipe images
type ImageQualityLevel string

const (
	// ImageQualityOriginal saves the original file as uploaded.
	// However, re-encoding will be performed if the image is not already a JPEG.
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
