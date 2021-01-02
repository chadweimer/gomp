package sqlcommon

import (
	"database/sql"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type RecipeDriver struct {
	*Driver
}

// Delete removes the specified recipe from the database using a dedicated transaction
// that is committed if there are not errors. Note that this method does not delete
// any attachments that we associated with the deleted recipe.
func (d RecipeDriver) Delete(id int64) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified recipe from the database using the specified transaction.
// Note that this method does not delete any attachments that we associated with the deleted recipe.
func (d RecipeDriver) DeleteTx(id int64, tx *sqlx.Tx) error {
	if _, err := tx.Exec("DELETE FROM recipe WHERE id = $1", id); err != nil {
		return fmt.Errorf("deleting recipe: %v", err)
	}

	return nil
}

// SetRating adds or updates the rating of the specified recipe.
func (d RecipeDriver) SetRating(id int64, rating float64) error {
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

// SetState updates the state of the specified recipe.
func (d RecipeDriver) SetState(id int64, state models.RecipeState) error {
	_, err := d.Db.Exec(
		"UPDATE recipe SET current_state = $1 WHERE id = $2", state, id)
	if err != nil {
		return fmt.Errorf("updating recipe state: %v", err)
	}

	return nil
}
