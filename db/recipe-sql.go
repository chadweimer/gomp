package db

import (
	"database/sql"
	"fmt"

	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
)

type sqlRecipeDriver struct {
	*sqlDriver
}

var supportedSearchFields = [...]models.SearchField{models.SearchFieldName, models.SearchFieldIngredients, models.SearchFieldDirections}

func (d *sqlRecipeDriver) Delete(id int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deletetx(id, tx)
	})
}

func (d *sqlRecipeDriver) deletetx(id int64, tx *sqlx.Tx) error {
	if _, err := tx.Exec("DELETE FROM recipe WHERE id = $1", id); err != nil {
		return fmt.Errorf("deleting recipe: %v", err)
	}

	return nil
}

func (d *sqlRecipeDriver) GetRating(id int64) (*float32, error) {
	var rating float32
	err := d.Db.Get(&rating,
		"SELECT COALESCE(g.rating, 0) AS avg_rating FROM recipe AS r "+
			"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id "+
			"WHERE r.id = $1", id)
	if err != nil {
		return nil, fmt.Errorf("updating recipe state: %v", err)
	}

	return &rating, nil
}

func (d *sqlRecipeDriver) SetRating(id int64, rating float32) error {
	var count int64
	err := d.Db.Get(&count, "SELECT count(*) FROM recipe_rating WHERE recipe_id = $1", id)

	if err == sql.ErrNoRows || count == 0 {
		_, err = d.Db.Exec(
			"INSERT INTO recipe_rating (recipe_id, rating) VALUES ($1, $2)", id, rating)
		if err != nil {
			return fmt.Errorf("creating recipe rating: %v", err)
		}
	} else if err == nil {
		_, err = d.Db.Exec(
			"UPDATE recipe_rating SET rating = $1 WHERE recipe_id = $2", rating, id)
	}

	if err != nil {
		return fmt.Errorf("updating recipe rating: %v", err)
	}

	return nil
}

func (d *sqlRecipeDriver) GetState(id int64) (*models.RecipeState, error) {
	var state models.RecipeState
	err := d.Db.Get(&state,
		"SELECT current_state FROM recipe WHERE id = $1", id)
	if err != nil {
		return nil, fmt.Errorf("updating recipe state: %v", err)
	}

	return &state, nil
}

func (d *sqlRecipeDriver) SetState(id int64, state models.RecipeState) error {
	_, err := d.Db.Exec(
		"UPDATE recipe SET current_state = $1 WHERE id = $2", state, id)
	if err != nil {
		return fmt.Errorf("updating recipe state: %v", err)
	}

	return nil
}

func containsField(fields []models.SearchField, field models.SearchField) bool {
	for _, a := range fields {
		if a == field {
			return true
		}
	}
	return false
}
