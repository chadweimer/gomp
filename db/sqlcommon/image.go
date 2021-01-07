package sqlcommon

import (
	"database/sql"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type RecipeImageDriver struct {
	*Driver
}

func (d *RecipeImageDriver) Read(id int64) (*models.RecipeImage, error) {
	var image *models.RecipeImage
	err := d.Tx(func(tx *sqlx.Tx) error {
		var err error
		image, err = d.ReadTx(id, tx)

		return err
	})

	return image, err
}

func (d *RecipeImageDriver) ReadTx(id int64, tx *sqlx.Tx) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	err := tx.Get(image, "SELECT * FROM recipe_image WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, db.ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return image, nil
}

func (d *RecipeImageDriver) ReadMainImage(recipeID int64) (*models.RecipeImage, error) {
	image := new(models.RecipeImage)
	err := d.Db.Get(image, "SELECT * FROM recipe_image WHERE id = (SELECT image_id FROM recipe WHERE id = $1)", recipeID)
	if err == sql.ErrNoRows {
		return nil, db.ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return image, nil
}

func (d *RecipeImageDriver) UpdateMainImage(image *models.RecipeImage) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.UpdateMainImageTx(image, tx)
	})
}

func (d *RecipeImageDriver) UpdateMainImageTx(image *models.RecipeImage, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe SET image_id = $1 WHERE id = $2",
		image.ID, image.RecipeID)

	return err
}

// List returns a RecipeImage slice that contains data for all images
// attached to the specified recipe.
func (d *RecipeImageDriver) List(recipeID int64) (*[]models.RecipeImage, error) {
	var images []models.RecipeImage

	if err := d.Db.Select(&images, "SELECT * FROM recipe_image WHERE recipe_id = $1 ORDER BY created_at ASC", recipeID); err != nil {
		return nil, err
	}

	return &images, nil
}

// Delete removes the specified image from the backing store and database
// using a dedicated transation that is committed if there are not errors.
func (d *RecipeImageDriver) Delete(id int64) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified image from the backing store and database
// using the specified transaction.
func (d *RecipeImageDriver) DeleteTx(id int64, tx *sqlx.Tx) error {
	image, err := d.ReadTx(id, tx)
	if err != nil {
		return err
	}

	if _, err = tx.Exec("DELETE FROM recipe_image WHERE id = $1", id); err != nil {
		return err
	}

	// Switch to a new main image if necessary, since the image we just deleted may have been the main image
	return d.SetMainImageIfNecessary(image.RecipeID, tx)
}

func (d *RecipeImageDriver) SetMainImageIfNecessary(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1)"+
			"WHERE id = $1 AND image_id IS NULL",
		recipeID)
	return err
}

func (d *RecipeImageDriver) DeleteAll(recipeID int64) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.DeleteAllTx(recipeID, tx)
	})
}

func (d *RecipeImageDriver) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_image WHERE recipe_id = $1",
		recipeID)
	return err
}
