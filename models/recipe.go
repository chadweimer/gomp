package models

import (
	"time"
)

// RecipeState represents an enumeration of states that a recipe can be in
type RecipeState string

const (
	// ActiveRecipeState represents an active recipe
	ActiveRecipeState RecipeState = "active"

	// ArchivedRecipeState represents a recipe that has been archived
	ArchivedRecipeState RecipeState = "archived"

	// DeletedRecipeState represents a recipe that has been deleted
	DeletedRecipeState RecipeState = "deleted"
)

type recipeBase struct {
	ID         int64       `json:"id" db:"id"`
	Name       string      `json:"name" db:"name"`
	State      RecipeState `json:"state" db:"current_state"`
	CreatedAt  time.Time   `json:"createdAt" db:"created_at"`
	ModifiedAt time.Time   `json:"modifiedAt" db:"modified_at"`
	AvgRating  float64     `json:"averageRating" db:"avg_rating"`
}

// RecipeCompact is the primary model class for bulk recipe retrieval
type RecipeCompact struct {
	recipeBase

	ThumbnailURL string `json:"thumbnailUrl" db:"thumbnail_url"`
}

// Recipe is the primary model class for recipe storage and retrieval
type Recipe struct {
	recipeBase

	ServingSize         string   `json:"servingSize" db:"serving_size"`
	NutritionInfo       string   `json:"nutritionInfo" db:"nutrition_info"`
	Ingredients         string   `json:"ingredients" db:"ingredients"`
	Directions          string   `json:"directions" db:"directions"`
	StorageInstructions string   `json:"storageInstructions" db:"storage_instructions"`
	SourceURL           string   `json:"sourceUrl" db:"source_url"`
	Tags                []string `json:"tags"`
}
