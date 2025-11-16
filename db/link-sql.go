package db

import (
	"context"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlLinkDriver struct {
	Db *sqlx.DB
}

func (d *sqlLinkDriver) Create(ctx context.Context, recipeID, destRecipeID int64) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.createImpl(ctx, recipeID, destRecipeID, db)
	})
}

func (*sqlLinkDriver) createImpl(ctx context.Context, recipeID, destRecipeID int64, db sqlx.ExecerContext) error {
	stmt := "INSERT INTO recipe_link (recipe_id, dest_recipe_id) VALUES ($1, $2)"

	_, err := db.ExecContext(ctx, stmt, recipeID, destRecipeID)
	return err
}

func (d *sqlLinkDriver) Delete(ctx context.Context, recipeID, destRecipeID int64) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.deleteImpl(ctx, recipeID, destRecipeID, db)
	})
}

func (*sqlLinkDriver) deleteImpl(ctx context.Context, recipeID, destRecipeID int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx,
		"DELETE FROM recipe_link WHERE (recipe_id = $1 AND dest_recipe_id = $2) OR (recipe_id = $2 AND dest_recipe_id = $1)",
		recipeID,
		destRecipeID)
	return err
}

func (d *sqlLinkDriver) List(ctx context.Context, recipeID int64) (*[]models.RecipeCompact, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*[]models.RecipeCompact, error) {
		recipes := make([]models.RecipeCompact, 0)

		selectStmt := "SELECT " +
			"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating, COALESCE(i.thumbnail_url, '') AS thumbnail_url " +
			"FROM recipe AS r " +
			"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
			"LEFT OUTER JOIN recipe_image as i ON r.image_id = i.id " +
			"WHERE " +
			"r.id IN (SELECT dest_recipe_id FROM recipe_link WHERE recipe_id = $1) OR " +
			"r.id IN (SELECT recipe_id FROM recipe_link WHERE dest_recipe_id = $1) " +
			"ORDER BY r.name ASC"
		if err := sqlx.SelectContext(ctx, db, &recipes, selectStmt, recipeID); err != nil {
			return nil, err
		}

		return &recipes, nil
	})
}
