package models

import "time"

// RecipeList represents a collection of recipes
type RecipeList struct {
	ID         int64       `json:"id" db:"id"`
	Name       string      `json:"name" db:"name"`
	State      EntityState `json:"state" db:"current_state"`
	CreatedAt  time.Time   `json:"createdAt" db:"created_at"`
	ModifiedAt time.Time   `json:"modifiedAt" db:"modified_at"`
}
