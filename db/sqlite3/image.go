package sqlite3

import (
	"fmt"

	"github.com/chadweimer/gomp/db/sqlcommon"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type recipeImageDriver struct {
	*sqlcommon.RecipeImageDriver
}

func newRecipeImageDriver(driver *driver) *recipeImageDriver {
	return &recipeImageDriver{
		RecipeImageDriver: &sqlcommon.RecipeImageDriver{Driver: driver.Driver},
	}
}

func (d recipeImageDriver) Create(imageInfo *models.RecipeImage) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(imageInfo, tx)
	})
}

func (d recipeImageDriver) CreateTx(image *models.RecipeImage, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url) " +
		"VALUES ($1, $2, $3, $4)"

	res, err := tx.Exec(stmt, image.RecipeID, image.Name, image.URL, image.ThumbnailURL)
	if err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %v", err)
	}
	image.ID, _ = res.LastInsertId()

	// Switch to a new main image if necessary, since this might be the first image attached
	return d.SetMainImageIfNecessary(image.RecipeID, tx)
}
