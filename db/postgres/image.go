package postgres

import (
	"database/sql"
	"fmt"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type postgresRecipeImageDriver struct {
	*postgresDriver
}

func (d postgresRecipeImageDriver) Create(imageInfo *models.RecipeImage) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(imageInfo, tx)
	})
}

func (d postgresRecipeImageDriver) CreateTx(image *models.RecipeImage, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url) " +
		"VALUES ($1, $2, $3, $4) RETURNING id"

	if err := tx.Get(image, stmt, image.RecipeID, image.Name, image.URL, image.ThumbnailURL); err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %v", err)
	}

	// Switch to a new main image if necessary, since this might be the first image attached
	return d.setMainImageIfNecessary(image.RecipeID, tx)
}

func (d postgresRecipeImageDriver) Read(id int64) (*models.RecipeImage, error) {
	var image *models.RecipeImage
	err := d.tx(func(tx *sqlx.Tx) error {
		var err error
		image, err = d.ReadTx(id, tx)

		return err
	})

	return image, err
}

func (d postgresRecipeImageDriver) ReadTx(id int64, tx *sqlx.Tx) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	err := tx.Get(image, "SELECT * FROM recipe_image WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, db.ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return image, nil
}

func (d postgresRecipeImageDriver) ReadMainImage(recipeID int64) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	err := d.db.Get(image, "SELECT * FROM recipe_image WHERE id = (SELECT image_id FROM recipe WHERE id = $1)", recipeID)
	if err == sql.ErrNoRows {
		return nil, db.ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return image, nil
}

func (d postgresRecipeImageDriver) UpdateMainImage(image *models.RecipeImage) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.UpdateMainImageTx(image, tx)
	})
}

func (d postgresRecipeImageDriver) UpdateMainImageTx(image *models.RecipeImage, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe SET image_id = $1 WHERE id = $2",
		image.ID, image.RecipeID)

	return err
}

// List returns a RecipeImage slice that contains data for all images
// attached to the specified recipe.
func (d postgresRecipeImageDriver) List(recipeID int64) (*[]models.RecipeImage, error) {
	var images []models.RecipeImage

	if err := d.db.Select(&images, "SELECT * FROM recipe_image WHERE recipe_id = $1 ORDER BY created_at ASC", recipeID); err != nil {
		return nil, err
	}

	return &images, nil
}

// Delete removes the specified image from the backing store and database
// using a dedicated transation that is committed if there are not errors.
func (d postgresRecipeImageDriver) Delete(id int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified image from the backing store and database
// using the specified transaction.
func (d postgresRecipeImageDriver) DeleteTx(id int64, tx *sqlx.Tx) error {
	image, err := d.ReadTx(id, tx)
	if err != nil {
		return err
	}

	if _, err = tx.Exec("DELETE FROM recipe_image WHERE id = $1", id); err != nil {
		return err
	}

	// Switch to a new main image if necessary, since the image we just deleted may have been the main image
	return d.setMainImageIfNecessary(image.RecipeID, tx)
}

func (d postgresRecipeImageDriver) setMainImageIfNecessary(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1)"+
			"WHERE id = $1 AND image_id IS NULL",
		recipeID)
	return err
}

func (d postgresRecipeImageDriver) DeleteAll(recipeID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.DeleteAllTx(recipeID, tx)
	})
}

func (d postgresRecipeImageDriver) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_image WHERE recipe_id = $1",
		recipeID)
	return err
}
