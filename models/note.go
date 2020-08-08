package models

import (
	"time"
)

// Note represents an individual comment (or note) on a recipe
type Note struct {
	ID         int64     `json:"id" db:"id"`
	RecipeID   int64     `json:"recipeId" db:"recipe_id"`
	Note       string    `json:"text" db:"note"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
	ModifiedAt time.Time `json:"modifiedAt" db:"modified_at"`
}
