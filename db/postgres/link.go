package postgres

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

// postgresLinkDriver provides functionality to edit and retrieve recipe links.
type postgresLinkDriver struct {
	*postgresDriver
}

// Create stores a link between 2 recipes in the database as a new record
// using a dedicated transation that is committed if there are not errors.
func (d *postgresLinkDriver) Create(recipeID, destRecipeID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(recipeID, destRecipeID, tx)
	})
}

// CreateTx stores a link between 2 recipes in the database as a new record
// using the specified transaction.
func (d *postgresLinkDriver) CreateTx(recipeID, destRecipeID int64, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_link (recipe_id, dest_recipe_id) VALUES ($1, $2)"

	_, err := tx.Exec(stmt, recipeID, destRecipeID)
	return err
}

// Delete removes the linked recipe from the database using a dedicated transation
// that is committed if there are not errors.
func (d *postgresLinkDriver) Delete(recipeID, destRecipeID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(recipeID, destRecipeID, tx)
	})
}

// DeleteTx removes the linked recipe from the database using the specified transaction.
func (d *postgresLinkDriver) DeleteTx(recipeID, destRecipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_link WHERE (recipe_id = $1 AND dest_recipe_id = $2) OR (recipe_id = $2 AND dest_recipe_id = $1)",
		recipeID,
		destRecipeID)
	return err
}

// List retrieves all recipes linked to recipe with the specified id.
func (d *postgresLinkDriver) List(recipeID int64) (*[]models.RecipeCompact, error) {
	var recipes []models.RecipeCompact

	selectStmt := "SELECT " +
		"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE((SELECT g.rating FROM recipe_rating AS g WHERE g.recipe_id = r.id), 0) AS avg_rating, COALESCE((SELECT thumbnail_url FROM recipe_image WHERE id = r.image_id), '') AS thumbnail_url " +
		"FROM recipe AS r " +
		"WHERE " +
		"r.id IN (SELECT dest_recipe_id FROM recipe_link WHERE recipe_id = $1) OR " +
		"r.id IN (SELECT recipe_id FROM recipe_link WHERE dest_recipe_id = $1) " +
		"ORDER BY r.name ASC"
	if err := d.db.Select(&recipes, selectStmt, recipeID); err != nil {
		return nil, err
	}

	return &recipes, nil
}
