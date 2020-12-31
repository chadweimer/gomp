package models

import (
	"time"
)

// RecipeImage represents the data associated with an image attached to a recipe
type RecipeImage struct {
	ID           int64     `json:"id" db:"id"`
	RecipeID     int64     `json:"recipeId" db:"recipe_id"`
	Name         string    `json:"name" db:"name"`
	URL          string    `json:"url" db:"url"`
	ThumbnailURL string    `json:"thumbnailUrl" db:"thumbnail_url"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	ModifiedAt   time.Time `json:"modifiedAt" db:"modified_at"`
}
