package models

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// RecipeModel provides functionality to edit and retrieve recipes.
type RecipeModel struct {
	*Model
}

type recipeBase struct {
	ID         int64       `json:"id" db:"id"`
	Name       string      `json:"name" db:"name"`
	State      EntityState `json:"state" db:"current_state"`
	CreatedAt  time.Time   `json:"createdAt" db:"created_at"`
	ModifiedAt time.Time   `json:"modifiedAt" db:"modified_at"`
	AvgRating  float64     `json:"averageRating" db:"avg_rating"`
}

// Recipe is the primary model class for recipe storage and retrieval
type Recipe struct {
	recipeBase

	ServingSize   string   `json:"servingSize" db:"serving_size"`
	NutritionInfo string   `json:"nutritionInfo" db:"nutrition_info"`
	Ingredients   string   `json:"ingredients" db:"ingredients"`
	Directions    string   `json:"directions" db:"directions"`
	SourceURL     string   `json:"sourceUrl" db:"source_url"`
	Tags          []string `json:"tags"`
}

// Create stores the recipe in the database as a new record using
// a dedicated transaction that is committed if there are not errors.
func (m *RecipeModel) Create(recipe *Recipe) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(recipe, tx)
	})
}

// CreateTx stores the recipe in the database as a new record using
// the specified transaction.
func (m *RecipeModel) CreateTx(recipe *Recipe, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe (name, serving_size, nutrition_info, ingredients, directions, source_url) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	err := tx.Get(recipe, stmt,
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.SourceURL)
	if err != nil {
		return fmt.Errorf("creating recipe: %v", err)
	}

	for _, tag := range recipe.Tags {
		err := m.Tags.CreateTx(recipe.ID, tag, tx)
		if err != nil {
			return fmt.Errorf("adding tags to new recipe: %v", err)
		}
	}

	return nil
}

// Read retrieves the information about the recipe from the database, if found.
// If no recipe exists with the specified ID, a NoRecordFound error is returned.
func (m *RecipeModel) Read(id int64) (*Recipe, error) {
	stmt := "SELECT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, r.source_url, r.current_state, r.created_at, r.modified_at, COALESCE((SELECT g.rating FROM recipe_rating AS g WHERE g.recipe_id = r.id), 0) AS avg_rating " +
		"FROM recipe AS r WHERE r.id = $1"
	recipe := new(Recipe)
	err := m.db.Get(recipe, stmt, id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("reading recipe: %v", err)
	}

	tags, err := m.Tags.List(id)
	if err != nil {
		return nil, fmt.Errorf("reading tags for recipe: %v", err)
	}
	recipe.Tags = *tags

	return recipe, nil
}

// Update stores the specified recipe in the database by updating the
// existing record with the specified id using a dedicated transaction
// that is committed if there are not errors.
func (m *RecipeModel) Update(recipe *Recipe) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateTx(recipe, tx)
	})
}

// UpdateTx stores the specified recipe in the database by updating the
// existing record with the specified id using the specified transaction.
func (m *RecipeModel) UpdateTx(recipe *Recipe, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET name = $1, serving_size = $2, nutrition_info = $3, ingredients = $4, directions = $5, source_url = $6, modified_at = transaction_timestamp() "+
			"WHERE id = $7",
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.SourceURL, recipe.ID)
	if err != nil {
		return fmt.Errorf("updating recipe: %v", err)
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	err = m.Tags.DeleteAllTx(recipe.ID, tx)
	if err != nil {
		return fmt.Errorf("deleting tags before updating on recipe: %v", err)
	}
	for _, tag := range recipe.Tags {
		err = m.Tags.CreateTx(recipe.ID, tag, tx)
		if err != nil {
			return fmt.Errorf("updating tags on recipe: %v", err)
		}
	}

	return nil
}

// Delete removes the specified recipe from the database using a dedicated transaction
// that is committed if there are not errors. Note that this method does not delete
// any attachments that we associated with the deleted recipe.
func (m *RecipeModel) Delete(id int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified recipe from the database using the specified transaction.
// Note that this method does not delete any attachments that we associated with the deleted recipe.
func (m *RecipeModel) DeleteTx(id int64, tx *sqlx.Tx) error {
	if _, err := tx.Exec("DELETE FROM recipe WHERE id = $1", id); err != nil {
		return fmt.Errorf("deleting recipe: %v", err)
	}

	// If we successfully deleted the recipe, delete all of it's attachments
	return m.Images.DeleteAllTx(id, tx)
}

// SetRating adds or updates the rating of the specified recipe.
func (m *RecipeModel) SetRating(id int64, rating float64) error {
	var count int64
	err := m.db.Get(&count, "SELECT count(*) FROM recipe_rating WHERE recipe_id = $1", id)

	if err == sql.ErrNoRows || count == 0 {
		_, err = m.db.Exec(
			"INSERT INTO recipe_rating (recipe_id, rating) VALUES ($1, $2)", id, rating)
		if err != nil {
			return fmt.Errorf("creating recipe rating: %v", err)
		}
	} else if err == nil {
		_, err = m.db.Exec(
			"UPDATE recipe_rating SET rating = $1 WHERE recipe_id = $2", rating, id)
	}

	if err != nil {
		return fmt.Errorf("updating recipe rating: %v", err)
	}

	return nil
}

// SetState updates the state of the specified recipe.
func (m *RecipeModel) SetState(id int64, state EntityState) error {
	_, err := m.db.Exec(
		"UPDATE recipe SET current_state = $1 WHERE id = $2", state, id)
	if err != nil {
		return fmt.Errorf("updating recipe state: %v", err)
	}

	return nil
}
