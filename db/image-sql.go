package db

import (
	"fmt"

	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
)

type sqlRecipeImageDriver struct {
	*sqlDriver
}

func (d *sqlRecipeImageDriver) Create(imageInfo *models.RecipeImage) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.CreateImpl(imageInfo, db)
	})
}

func (d *sqlRecipeImageDriver) CreateImpl(image *models.RecipeImage, db sqlx.Execer) error {
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url) " +
		"VALUES ($1, $2, $3, $4)"

	res, err := db.Exec(stmt, image.RecipeId, image.Name, image.Url, image.ThumbnailUrl)
	if err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %w", err)
	}
	imageId, _ := res.LastInsertId()
	image.Id = &imageId

	// Switch to a new main image if necessary, since this might be the first image attached
	return d.setMainImageIfNecessary(*image.RecipeId, db)
}

func (d *sqlRecipeImageDriver) Read(recipeId, id int64) (*models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.Queryer) (*models.RecipeImage, error) {
		return d.readImpl(recipeId, id, db)
	})
}

func (*sqlRecipeImageDriver) readImpl(recipeId, id int64, db sqlx.Queryer) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	if err := sqlx.Get(db, image, "SELECT * FROM recipe_image WHERE id = $1 AND recipe_id = $2", id, recipeId); err != nil {
		return nil, err
	}

	return image, nil
}

func (d *sqlRecipeImageDriver) ReadMainImage(recipeId int64) (*models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.Queryer) (*models.RecipeImage, error) {
		image := new(models.RecipeImage)
		if err := sqlx.Get(db, image, "SELECT * FROM recipe_image WHERE id = (SELECT image_id FROM recipe WHERE id = $1)", recipeId); err != nil {
			return nil, err
		}

		return image, nil
	})
}

func (d *sqlRecipeImageDriver) UpdateMainImage(image *models.RecipeImage) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updateMainImageImpl(image, db)
	})
}

func (*sqlRecipeImageDriver) updateMainImageImpl(image *models.RecipeImage, db sqlx.Execer) error {
	_, err := db.Exec(
		"UPDATE recipe SET image_id = $1 WHERE id = $2",
		image.Id, image.RecipeId)

	return err
}

func (d *sqlRecipeImageDriver) List(recipeId int64) (*[]models.RecipeImage, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]models.RecipeImage, error) {
		var images []models.RecipeImage

		if err := sqlx.Select(db, &images, "SELECT * FROM recipe_image WHERE recipe_id = $1 ORDER BY created_at ASC", recipeId); err != nil {
			return nil, err
		}

		return &images, nil
	})
}

func (d *sqlRecipeImageDriver) Delete(recipeId, id int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteImpl(recipeId, id, db)
	})
}

func (d *sqlRecipeImageDriver) deleteImpl(recipeId, id int64, db sqlx.Execer) error {
	if _, err := db.Exec("DELETE FROM recipe_image WHERE id = $1 AND recipe_id = $2", id, recipeId); err != nil {
		return err
	}

	// Switch to a new main image if necessary, since the image we just deleted may have been the main image
	return d.setMainImageIfNecessary(recipeId, db)
}

func (*sqlRecipeImageDriver) setMainImageIfNecessary(recipeId int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"UPDATE recipe "+
			"SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1)"+
			"WHERE id = $1 AND image_id IS NULL",
		recipeId)
	return err
}

func (d *sqlRecipeImageDriver) DeleteAll(recipeId int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteAllImpl(recipeId, db)
	})
}

func (*sqlRecipeImageDriver) deleteAllImpl(recipeId int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"DELETE FROM recipe_image WHERE recipe_id = $1",
		recipeId)
	return err
}
