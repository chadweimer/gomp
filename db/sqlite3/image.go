package sqlite3

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqliteRecipeImageDriver struct {
	*sqliteDriver
}

func (d sqliteRecipeImageDriver) Create(imageInfo *models.RecipeImage) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(imageInfo, tx)
	})
}

func (d sqliteRecipeImageDriver) CreateTx(image *models.RecipeImage, tx *sqlx.Tx) error {
	now := time.Now()
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url, created_at, modified_at) " +
		"VALUES ($1, $2, $3, $4, $5, $6)"

	res, err := tx.Exec(stmt, image.RecipeID, image.Name, image.URL, image.ThumbnailURL, now, now)
	if err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %v", err)
	}
	image.ID, _ = res.LastInsertId()

	// Switch to a new main image if necessary, since this might be the first image attached
	return d.setMainImageIfNecessary(image.RecipeID, tx)
}

func (d sqliteRecipeImageDriver) Read(id int64) (*models.RecipeImage, error) {
	var image *models.RecipeImage
	err := d.tx(func(tx *sqlx.Tx) error {
		var err error
		image, err = d.ReadTx(id, tx)

		return err
	})

	return image, err
}

func (d sqliteRecipeImageDriver) ReadTx(id int64, tx *sqlx.Tx) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	err := tx.Get(image, "SELECT * FROM recipe_image WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, db.ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return image, nil
}

func (d sqliteRecipeImageDriver) ReadMainImage(recipeID int64) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	err := d.db.Get(image, "SELECT * FROM recipe_image WHERE id = (SELECT image_id FROM recipe WHERE id = $1)", recipeID)
	if err == sql.ErrNoRows {
		return nil, db.ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return image, nil
}

func (d sqliteRecipeImageDriver) UpdateMainImage(image *models.RecipeImage) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.UpdateMainImageTx(image, tx)
	})
}

func (d sqliteRecipeImageDriver) UpdateMainImageTx(image *models.RecipeImage, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe SET image_id = $1 WHERE id = $2",
		image.ID, image.RecipeID)

	return err
}

// List returns a RecipeImage slice that contains data for all images
// attached to the specified recipe.
func (d sqliteRecipeImageDriver) List(recipeID int64) (*[]models.RecipeImage, error) {
	var images []models.RecipeImage

	if err := d.db.Select(&images, "SELECT * FROM recipe_image WHERE recipe_id = $1 ORDER BY created_at ASC", recipeID); err != nil {
		return nil, err
	}

	return &images, nil
}

// Delete removes the specified image from the backing store and database
// using a dedicated transation that is committed if there are not errors.
func (d sqliteRecipeImageDriver) Delete(id int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified image from the backing store and database
// using the specified transaction.
func (d sqliteRecipeImageDriver) DeleteTx(id int64, tx *sqlx.Tx) error {
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

func (d sqliteRecipeImageDriver) setMainImageIfNecessary(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1)"+
			"WHERE id = $1 AND image_id IS NULL",
		recipeID)
	return err
}

func (d sqliteRecipeImageDriver) DeleteAll(recipeID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.DeleteAllTx(recipeID, tx)
	})
}

func (d sqliteRecipeImageDriver) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_image WHERE recipe_id = $1",
		recipeID)
	return err
}
