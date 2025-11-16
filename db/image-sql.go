package db

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlRecipeImageDriver struct {
	Db *sqlx.DB
}

func (d *sqlRecipeImageDriver) Create(ctx context.Context, imageInfo *models.RecipeImage) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.createImpl(ctx, imageInfo, db)
	})
}

func (d *sqlRecipeImageDriver) createImpl(ctx context.Context, image *models.RecipeImage, db sqlx.ExtContext) error {
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url) " +
		"VALUES ($1, $2, $3, $4) RETURNING id"

	if err := sqlx.GetContext(ctx, db, image, stmt, image.RecipeID, image.Name, image.URL, image.ThumbnailURL); err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %w", err)
	}

	// Switch to a new main image if necessary, since this might be the first image attached
	return d.setMainImageIfNecessary(ctx, *image.RecipeID, db)
}

func (d *sqlRecipeImageDriver) Read(ctx context.Context, recipeID, id int64) (*models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*models.RecipeImage, error) {
		return d.readImpl(ctx, recipeID, id, db)
	})
}

func (*sqlRecipeImageDriver) readImpl(ctx context.Context, recipeID, id int64, db sqlx.QueryerContext) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	if err := sqlx.GetContext(ctx, db, image, "SELECT * FROM recipe_image WHERE id = $1 AND recipe_id = $2", id, recipeID); err != nil {
		return nil, err
	}

	return image, nil
}

func (d *sqlRecipeImageDriver) ReadMainImage(ctx context.Context, recipeID int64) (*models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*models.RecipeImage, error) {
		image := new(models.RecipeImage)
		if err := sqlx.GetContext(ctx, db, image, "SELECT * FROM recipe_image WHERE id = (SELECT image_id FROM recipe WHERE id = $1)", recipeID); err != nil {
			return nil, err
		}

		return image, nil
	})
}

func (d *sqlRecipeImageDriver) UpdateMainImage(ctx context.Context, recipeID, id int64) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.updateMainImageImpl(ctx, recipeID, id, db)
	})
}

func (*sqlRecipeImageDriver) updateMainImageImpl(ctx context.Context, recipeID, id int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx,
		"UPDATE recipe SET image_id = $1 WHERE id = $2",
		id, recipeID)

	return err
}

func (d *sqlRecipeImageDriver) List(ctx context.Context, recipeID int64) (*[]models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*[]models.RecipeImage, error) {
		images := make([]models.RecipeImage, 0)

		if err := sqlx.SelectContext(ctx, db, &images, "SELECT * FROM recipe_image WHERE recipe_id = $1 ORDER BY created_at ASC", recipeID); err != nil {
			return nil, err
		}

		return &images, nil
	})
}

func (d *sqlRecipeImageDriver) Delete(ctx context.Context, recipeID, id int64) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.deleteImpl(ctx, recipeID, id, db)
	})
}

func (d *sqlRecipeImageDriver) deleteImpl(ctx context.Context, recipeID, id int64, db sqlx.ExecerContext) error {
	if _, err := db.ExecContext(ctx, "DELETE FROM recipe_image WHERE id = $1 AND recipe_id = $2", id, recipeID); err != nil {
		return err
	}

	// Switch to a new main image if necessary, since the image we just deleted may have been the main image
	return d.setMainImageIfNecessary(ctx, recipeID, db)
}

func (*sqlRecipeImageDriver) setMainImageIfNecessary(ctx context.Context, recipeID int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx,
		"UPDATE recipe "+
			"SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1) "+
			"WHERE id = $1 AND image_id IS NULL",
		recipeID)
	return err
}

func (d *sqlRecipeImageDriver) DeleteAll(ctx context.Context, recipeID int64) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.deleteAllImpl(ctx, recipeID, db)
	})
}

func (*sqlRecipeImageDriver) deleteAllImpl(ctx context.Context, recipeID int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx,
		"DELETE FROM recipe_image WHERE recipe_id = $1",
		recipeID)
	return err
}
