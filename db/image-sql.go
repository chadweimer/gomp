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
	return d.tx(func(tx *sqlx.Tx) error {
		return d.Createtx(imageInfo, tx)
	})
}

func (d *sqlRecipeImageDriver) Createtx(image *models.RecipeImage, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url) " +
		"VALUES ($1, $2, $3, $4)"

	res, err := tx.Exec(stmt, image.RecipeId, image.Name, image.Url, image.ThumbnailUrl)
	if err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %v", err)
	}
	imageId, _ := res.LastInsertId()
	image.Id = &imageId

	// Switch to a new main image if necessary, since this might be the first image attached
	return d.setMainImageIfNecessary(*image.RecipeId, tx)
}

func (d *sqlRecipeImageDriver) Read(recipeId, id int64) (*models.RecipeImage, error) {
	var image *models.RecipeImage
	err := d.tx(func(tx *sqlx.Tx) error {
		var err error
		image, err = d.readtx(recipeId, id, tx)

		return err
	})

	return image, err
}

func (d *sqlRecipeImageDriver) readtx(recipeId, id int64, tx *sqlx.Tx) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	if err := tx.Get(image, "SELECT * FROM recipe_image WHERE id = $1 AND recipe_id = $2", id, recipeId); err != nil {
		return nil, mapSqlErrors(err)
	}

	return image, nil
}

func (d *sqlRecipeImageDriver) ReadMainImage(recipeId int64) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	if err := d.Db.Get(image, "SELECT * FROM recipe_image WHERE id = (SELECT image_id FROM recipe WHERE id = $1)", recipeId); err != nil {
		return nil, mapSqlErrors(err)
	}

	return image, nil
}

func (d *sqlRecipeImageDriver) UpdateMainImage(image *models.RecipeImage) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updateMainImagetx(image, tx)
	})
}

func (d *sqlRecipeImageDriver) updateMainImagetx(image *models.RecipeImage, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe SET image_id = $1 WHERE id = $2",
		image.Id, image.RecipeId)

	return err
}

func (d *sqlRecipeImageDriver) List(recipeId int64) (*[]models.RecipeImage, error) {
	var images []models.RecipeImage

	if err := d.Db.Select(&images, "SELECT * FROM recipe_image WHERE recipe_id = $1 ORDER BY created_at ASC", recipeId); err != nil {
		return nil, err
	}

	return &images, nil
}

func (d *sqlRecipeImageDriver) Delete(recipeId, id int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deletetx(recipeId, id, tx)
	})
}

func (d *sqlRecipeImageDriver) deletetx(recipeId, id int64, tx *sqlx.Tx) error {
	if _, err := tx.Exec("DELETE FROM recipe_image WHERE id = $1 AND recipe_id = $2", id, recipeId); err != nil {
		return mapSqlErrors(err)
	}

	// Switch to a new main image if necessary, since the image we just deleted may have been the main image
	return d.setMainImageIfNecessary(recipeId, tx)
}

func (d *sqlRecipeImageDriver) setMainImageIfNecessary(recipeId int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1)"+
			"WHERE id = $1 AND image_id IS NULL",
		recipeId)
	return err
}

func (d *sqlRecipeImageDriver) DeleteAll(recipeId int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deleteAlltx(recipeId, tx)
	})
}

func (d *sqlRecipeImageDriver) deleteAlltx(recipeId int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_image WHERE recipe_id = $1",
		recipeId)
	return err
}
