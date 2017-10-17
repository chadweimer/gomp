package models

import (
	"database/sql"

	"github.com/jmoiron/sqlx"
)

// RecipeModel provides functionality to edit and retrieve recipes.
type RecipeModel struct {
	*Model
}

// Recipe is the primary model class for recipe storage and retrieval
type Recipe struct {
	ID            int64    `json:"id" db:"id"`
	Name          string   `json:"name" db:"name"`
	ServingSize   string   `json:"servingSize" db:"serving_size"`
	NutritionInfo string   `json:"nutritionInfo" db:"nutrition_info"`
	Ingredients   string   `json:"ingredients" db:"ingredients"`
	Directions    string   `json:"directions" db:"directions"`
	SourceURL     string   `json:"sourceUrl" db:"source_url"`
	AvgRating     float64  `json:"averageRating" db:"avg_rating"`
	Tags          []string `json:"tags"`
}

// Create stores the recipe in the database as a new record using
// a dedicated transation that is committed if there are not errors.
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
		return err
	}

	for _, tag := range recipe.Tags {
		err := m.Tags.CreateTx(recipe.ID, tag, tx)
		if err != nil {
			return err
		}
	}

	return nil
}

// Read retrieves the information about the recipe from the database, if found.
// If no recipe exists with the specified ID, a NoRecordFound error is returned.
func (m *RecipeModel) Read(id int64) (*Recipe, error) {
	stmt := "SELECT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, r.source_url, COALESCE((SELECT g.rating FROM recipe_rating AS g WHERE g.recipe_id = r.id), 0) AS avg_rating " +
		"FROM recipe AS r WHERE r.id = $1"
	recipe := new(Recipe)
	err := m.db.Get(recipe, stmt, id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	tags, err := m.Tags.List(id)
	if err != nil {
		return nil, err
	}
	recipe.Tags = *tags

	return recipe, nil
}

// Update stores the specified recipe in the database by updating the
// existing record with the specified id using a dedicated transation
// that is committed if there are not errors.
func (m *RecipeModel) Update(recipe *Recipe) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateTx(recipe, tx)
	})
}

// UpdateTx stores the specified recipe in the database by updating the
// existing record with the sepcified id using the specified transaction.
func (m *RecipeModel) UpdateTx(recipe *Recipe, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET name = $1, serving_size = $2, nutrition_info = $3, ingredients = $4, directions = $5, source_url = $6 "+
			"WHERE id = $7",
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.SourceURL, recipe.ID)
	if err != nil {
		return err
	}

	// Deleting and recreating seems inefficent. Maybe make this smarter.
	err = m.Tags.DeleteAllTx(recipe.ID, tx)
	if err != nil {
		return err
	}
	for _, tag := range recipe.Tags {
		err = m.Tags.CreateTx(recipe.ID, tag, tx)
		if err != nil {
			return err
		}
	}

	return nil
}

// Delete removes the specified recipe from the database using a dedicated transation
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
		return err
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
		return err
	}

	if err == nil {
		_, err = m.db.Exec(
			"UPDATE recipe_rating SET rating = $1 WHERE recipe_id = $2", rating, id)
	}
	return err
}
