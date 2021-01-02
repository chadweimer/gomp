package sqlcommon

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

// LinkDriver provides functionality to edit and retrieve recipe links.
type LinkDriver struct {
	*Driver
}

// Create stores a link between 2 recipes in the database as a new record
// using a dedicated transation that is committed if there are not errors.
func (d LinkDriver) Create(recipeID, destRecipeID int64) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(recipeID, destRecipeID, tx)
	})
}

// CreateTx stores a link between 2 recipes in the database as a new record
// using the specified transaction.
func (d LinkDriver) CreateTx(recipeID, destRecipeID int64, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_link (recipe_id, dest_recipe_id) VALUES ($1, $2)"

	_, err := tx.Exec(stmt, recipeID, destRecipeID)
	return err
}

// Delete removes the linked recipe from the database using a dedicated transation
// that is committed if there are not errors.
func (d LinkDriver) Delete(recipeID, destRecipeID int64) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(recipeID, destRecipeID, tx)
	})
}

// DeleteTx removes the linked recipe from the database using the specified transaction.
func (d LinkDriver) DeleteTx(recipeID, destRecipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_link WHERE (recipe_id = $1 AND dest_recipe_id = $2) OR (recipe_id = $2 AND dest_recipe_id = $1)",
		recipeID,
		destRecipeID)
	return err
}

// List retrieves all recipes linked to recipe with the specified id.
func (d LinkDriver) List(recipeID int64) (*[]models.RecipeCompact, error) {
	var recipes []models.RecipeCompact

	selectStmt := "SELECT " +
		"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating, COALESCE(i.thumbnail_url, '') AS thumbnail_url " +
		"FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id" +
		"LEFT OUTER JOIN recipe_image as i ON r.image_id = i.id" +
		"WHERE " +
		"r.id IN (SELECT dest_recipe_id FROM recipe_link WHERE recipe_id = $1) OR " +
		"r.id IN (SELECT recipe_id FROM recipe_link WHERE dest_recipe_id = $1) " +
		"ORDER BY r.name ASC"
	if err := d.Db.Select(&recipes, selectStmt, recipeID); err != nil {
		return nil, err
	}

	return &recipes, nil
}
