package db

import (
	"fmt"

	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
)

type postgresRecipeImageDriver struct {
	*sqlRecipeImageDriver
}

func (d *postgresRecipeImageDriver) Create(imageInfo *models.RecipeImage) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(imageInfo, tx)
	})
}

func (d *postgresRecipeImageDriver) createtx(image *models.RecipeImage, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url) " +
		"VALUES ($1, $2, $3, $4) RETURNING id"

	if err := tx.Get(image, stmt, image.RecipeId, image.Name, image.Url, image.ThumbnailUrl); err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %v", err)
	}

	// Switch to a new main image if necessary, since this might be the first image attached
	return d.setMainImageIfNecessary(image.RecipeId, tx)
}
