package models

import (
	"strings"
)

//go:generate go tool oapi-codegen --config cfg.yaml ../models.yaml

// RowData represents a generic row of data, typically used for database rows
type RowData map[string]any

// TableData represents a table's data, including its name and the rows it contains
type TableData struct {
	TableName string    `json:"tableName"`
	Data      []RowData `json:"data"`
}

// BackupData represents the data structure used for backing up the entire database
type BackupData []TableData

// RecipeLink represents the links between recipes, allowing for connections such as "related recipes" or "similar recipes"
type RecipeLink struct {
	RecipeID     int64 `json:"recipe_id"`
	DestRecipeID int64 `json:"dest_recipe_id"`
}

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

// IsValid checks if the BackupMetadata has valid values (e.g., non-empty name and version)
func (m BackupMetadata) IsValid() bool {
	return strings.TrimSpace(m.Name) != "" && strings.TrimSpace(m.Version) != ""
}
