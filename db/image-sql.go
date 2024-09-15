package db

import (
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlRecipeImageDriver struct {
	Db *sqlx.DB
}

func (d *sqlRecipeImageDriver) Create(imageInfo *models.RecipeImage) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createImpl(imageInfo, db)
	})
}

func (d *sqlRecipeImageDriver) createImpl(image *models.RecipeImage, db sqlx.Ext) error {
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url) " +
		"VALUES ($1, $2, $3, $4) RETURNING id"

	if err := sqlx.Get(db, image, stmt, image.RecipeID, image.Name, image.URL, image.ThumbnailURL); err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %w", err)
	}

	// Switch to a new main image if necessary, since this might be the first image attached
	return d.setMainImageIfNecessary(*image.RecipeID, db)
}

func (d *sqlRecipeImageDriver) Read(recipeID, id int64) (*models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.Queryer) (*models.RecipeImage, error) {
		return d.readImpl(recipeID, id, db)
	})
}

func (*sqlRecipeImageDriver) readImpl(recipeID, id int64, db sqlx.Queryer) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	if err := sqlx.Get(db, image, "SELECT * FROM recipe_image WHERE id = $1 AND recipe_id = $2", id, recipeID); err != nil {
		return nil, err
	}

	return image, nil
}

func (d *sqlRecipeImageDriver) ReadMainImage(recipeID int64) (*models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.Queryer) (*models.RecipeImage, error) {
		image := new(models.RecipeImage)
		if err := sqlx.Get(db, image, "SELECT * FROM recipe_image WHERE id = (SELECT image_id FROM recipe WHERE id = $1)", recipeID); err != nil {
			return nil, err
		}

		return image, nil
	})
}

func (d *sqlRecipeImageDriver) UpdateMainImage(recipeID, id int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updateMainImageImpl(recipeID, id, db)
	})
}

func (*sqlRecipeImageDriver) updateMainImageImpl(recipeID, id int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"UPDATE recipe SET image_id = $1 WHERE id = $2",
		id, recipeID)

	return err
}

func (d *sqlRecipeImageDriver) List(recipeID int64) (*[]models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]models.RecipeImage, error) {
		images := make([]models.RecipeImage, 0)

		if err := sqlx.Select(db, &images, "SELECT * FROM recipe_image WHERE recipe_id = $1 ORDER BY created_at ASC", recipeID); err != nil {
			return nil, err
		}

		return &images, nil
	})
}

func (d *sqlRecipeImageDriver) Delete(recipeID, id int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteImpl(recipeID, id, db)
	})
}

func (d *sqlRecipeImageDriver) deleteImpl(recipeID, id int64, db sqlx.Execer) error {
	if _, err := db.Exec("DELETE FROM recipe_image WHERE id = $1 AND recipe_id = $2", id, recipeID); err != nil {
		return err
	}

	// Switch to a new main image if necessary, since the image we just deleted may have been the main image
	return d.setMainImageIfNecessary(recipeID, db)
}

func (*sqlRecipeImageDriver) setMainImageIfNecessary(recipeID int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"UPDATE recipe "+
			"SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1) "+
			"WHERE id = $1 AND image_id IS NULL",
		recipeID)
	return err
}

func (d *sqlRecipeImageDriver) DeleteAll(recipeID int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteAllImpl(recipeID, db)
	})
}

func (*sqlRecipeImageDriver) deleteAllImpl(recipeID int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"DELETE FROM recipe_image WHERE recipe_id = $1",
		recipeID)
	return err
}
