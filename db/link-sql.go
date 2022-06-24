package db

import (
	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
)

type sqlLinkDriver struct {
	*sqlDriver
}

func (d *sqlLinkDriver) Create(recipeId, destRecipeId int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createImpl(recipeId, destRecipeId, db)
	})
}

func (*sqlLinkDriver) createImpl(recipeId, destRecipeId int64, db sqlx.Execer) error {
	stmt := "INSERT INTO recipe_link (recipe_id, dest_recipe_id) VALUES ($1, $2)"

	_, err := db.Exec(stmt, recipeId, destRecipeId)
	return err
}

func (d *sqlLinkDriver) Delete(recipeId, destRecipeId int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteImpl(recipeId, destRecipeId, db)
	})
}

func (*sqlLinkDriver) deleteImpl(recipeId, destRecipeId int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"DELETE FROM recipe_link WHERE (recipe_id = $1 AND dest_recipe_id = $2) OR (recipe_id = $2 AND dest_recipe_id = $1)",
		recipeId,
		destRecipeId)
	return err
}

func (d *sqlLinkDriver) List(recipeId int64) (*[]models.RecipeCompact, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]models.RecipeCompact, error) {
		var recipes []models.RecipeCompact

		selectStmt := "SELECT " +
			"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating, COALESCE(i.thumbnail_url, '') AS thumbnail_url " +
			"FROM recipe AS r " +
			"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
			"LEFT OUTER JOIN recipe_image as i ON r.image_id = i.id " +
			"WHERE " +
			"r.id IN (SELECT dest_recipe_id FROM recipe_link WHERE recipe_id = $1) OR " +
			"r.id IN (SELECT recipe_id FROM recipe_link WHERE dest_recipe_id = $1) " +
			"ORDER BY r.name ASC"
		if err := sqlx.Select(db, &recipes, selectStmt, recipeId); err != nil {
			return nil, err
		}

		return &recipes, nil
	})
}
