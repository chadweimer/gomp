package db

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlRecipeDriver struct {
	*sqlDriver
}

var supportedSearchFields = [...]models.SearchField{models.SearchFieldName, models.SearchFieldIngredients, models.SearchFieldDirections}

func (d *sqlRecipeDriver) Delete(id int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteImpl(id, db)
	})
}

func (*sqlRecipeDriver) deleteImpl(id int64, db sqlx.Execer) error {
	if _, err := db.Exec("DELETE FROM recipe WHERE id = $1", id); err != nil {
		return fmt.Errorf("deleting recipe: %w", err)
	}

	return nil
}

func (d *sqlRecipeDriver) GetRating(id int64) (*float32, error) {
	return get(d.Db, func(db sqlx.Queryer) (*float32, error) {
		var rating float32
		err := sqlx.Get(db, &rating,
			"SELECT COALESCE(g.rating, 0) AS avg_rating FROM recipe AS r "+
				"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id "+
				"WHERE r.id = $1", id)
		if err != nil {
			return nil, fmt.Errorf("updating recipe state: %w", err)
		}

		return &rating, nil
	})
}

func (d *sqlRecipeDriver) SetRating(id int64, rating float32) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		var count int64
		err := sqlx.Get(db, &count, "SELECT count(*) FROM recipe_rating WHERE recipe_id = $1", id)

		if errors.Is(err, sql.ErrNoRows) || count == 0 {
			_, err = db.Exec(
				"INSERT INTO recipe_rating (recipe_id, rating) VALUES ($1, $2)", id, rating)
			if err != nil {
				return fmt.Errorf("creating recipe rating: %w", err)
			}
		} else if err == nil {
			_, err = db.Exec(
				"UPDATE recipe_rating SET rating = $1 WHERE recipe_id = $2", rating, id)
		}

		if err != nil {
			return fmt.Errorf("updating recipe rating: %w", err)
		}

		return nil
	})
}

func (d *sqlRecipeDriver) SetState(id int64, state models.RecipeState) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		_, err := db.Exec(
			"UPDATE recipe SET current_state = $1 WHERE id = $2", state, id)
		if err != nil {
			return fmt.Errorf("updating recipe state: %w", err)
		}

		return nil
	})
}

func containsField(fields []models.SearchField, field models.SearchField) bool {
	for _, a := range fields {
		if a == field {
			return true
		}
	}
	return false
}
