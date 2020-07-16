package models

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"image"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/chadweimer/gomp/upload"
	"github.com/disintegration/imageorient"
	"github.com/disintegration/imaging"
	"github.com/jmoiron/sqlx"
)

// RecipeImageModel provides functionality to edit and retrieve images attached to recipes
type RecipeImageModel struct {
	*Model
	upl upload.Driver
}

// RecipeImage represents the data associated with an image attached to a recipe
type RecipeImage struct {
	ID           int64     `json:"id" db:"id"`
	RecipeID     int64     `json:"recipeId" db:"recipe_id"`
	Name         string    `json:"name" db:"name"`
	URL          string    `json:"url" db:"url"`
	ThumbnailURL string    `json:"thumbnailUrl" db:"thumbnail_url"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	ModifiedAt   time.Time `json:"modifiedAt" db:"modified_at"`
}

// Create saves the image using the backing upload.Driver and creates
// an associated record in the database using a dedicated transation
// that is committed if there are not errors.
func (m *RecipeImageModel) Create(imageInfo *RecipeImage, imageData []byte) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(imageInfo, imageData, tx)
	})
}

// CreateTx saves the image using the backing upload.Driver and creates
// an associated record in the database using the specified transaction.
func (m *RecipeImageModel) CreateTx(imageInfo *RecipeImage, imageData []byte, tx *sqlx.Tx) error {
	origURL, thumbURL, err := m.save(imageInfo, imageData)
	if err != nil {
		return fmt.Errorf("failed to save image before inserting to db: %v", err)
	}

	// Since uploading the image was successful, add a record to the DB
	imageInfo.URL = origURL
	imageInfo.ThumbnailURL = thumbURL
	return m.createImpl(imageInfo, tx)
}

func (m *RecipeImageModel) createImpl(image *RecipeImage, tx *sqlx.Tx) error {
	now := time.Now()
	stmt := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url, created_at, modified_at) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	if err := tx.Get(image, stmt, image.RecipeID, image.Name, image.URL, image.ThumbnailURL, now, now); err != nil {
		return fmt.Errorf("failed to insert db record for newly saved image: %v", err)
	}

	// Switch to a new main image if necessary, since this might be the first image attached
	return m.setMainImageIfNecessary(image.RecipeID, tx)
}

func (m *RecipeImageModel) save(imageInfo *RecipeImage, data []byte) (string, string, error) {
	ok, contentType := isImageFile(data)
	if !ok {
		return "", "", errors.New("attachment must be an image")
	}

	// First decode the image
	dataReader := bytes.NewReader(data)
	image, _, err := imageorient.Decode(dataReader)
	if err != nil {
		return "", "", fmt.Errorf("failed to decode image: %v", err)
	}

	// Then generate a thumbnail image
	thumbData, err := m.generateThumbnail(image, contentType)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate thumbnail image: %v", err)
	}

	// Save the original image
	origDir := getDirPathForImage(imageInfo.RecipeID)
	origPath := filepath.Join(origDir, imageInfo.Name)
	origURL := filepath.ToSlash(filepath.Join("/uploads/", origPath))
	err = m.upl.Save(origPath, data)
	if err != nil {
		return "", "", fmt.Errorf("failed to save image using configured upload driver: %v", err)
	}

	// Save the thumbnail image
	thumbDir := getDirPathForThumbnail(imageInfo.RecipeID)
	thumbPath := filepath.Join(thumbDir, imageInfo.Name)
	thumbURL := filepath.ToSlash(filepath.Join("/uploads/", thumbPath))
	err = m.upl.Save(thumbPath, thumbData)
	if err != nil {
		return "", "", fmt.Errorf("failed to save thumbnail image using configured upload driver: %v", err)
	}

	return origURL, thumbURL, nil
}

func (m *RecipeImageModel) generateThumbnail(image image.Image, contentType string) ([]byte, error) {
	thumbImage := imaging.Thumbnail(image, 500, 500, imaging.NearestNeighbor)

	thumbBuf := new(bytes.Buffer)
	err := imaging.Encode(thumbBuf, thumbImage, getImageFormat(contentType), imaging.JPEGQuality(80))
	if err != nil {
		return nil, fmt.Errorf("failed to encode thumbnail image: %v", err)
	}

	return thumbBuf.Bytes(), nil
}

// ReadTx retrieves the information about the image from the database, if found,
// using the specified transaction. If no image exists with the specified ID,
// a ErrNotFound error is returned.
func (m *RecipeImageModel) ReadTx(id int64, tx *sqlx.Tx) (*RecipeImage, error) {
	image := new(RecipeImage)
	err := tx.Get(image, "SELECT * FROM recipe_image WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return image, nil
}

// ReadMainImage retrieves the information about the main image for the specified recipe
// image from the database. If no main image exists, a ErrNotFound error is returned.
func (m *RecipeImageModel) ReadMainImage(recipeID int64) (*RecipeImage, error) {
	image := new(RecipeImage)
	err := m.db.Get(image, "SELECT * FROM recipe_image WHERE id = (SELECT image_id FROM recipe WHERE id = $1)", recipeID)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return image, nil
}

// UpdateMainImage sets the id of the main image for the specified recipe
// using a dedicated transation that is committed if there are not errors.
func (m *RecipeImageModel) UpdateMainImage(image *RecipeImage) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateMainImageTx(image, tx)
	})
}

// UpdateMainImageTx sets the id of the main image for the specified recipe
// using the specified transaction.
func (m *RecipeImageModel) UpdateMainImageTx(image *RecipeImage, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe SET image_id = $1 WHERE id = $2",
		image.ID, image.RecipeID)

	return err
}

// List returns a RecipeImage slice that contains data for all images
// attached to the specified recipe.
func (m *RecipeImageModel) List(recipeID int64) (*[]RecipeImage, error) {
	var images []RecipeImage

	if err := m.db.Select(&images, "SELECT * FROM recipe_image WHERE recipe_id = $1 ORDER BY created_at ASC", recipeID); err != nil {
		return nil, err
	}

	return &images, nil
}

// Delete removes the specified image from the backing store and database
// using a dedicated transation that is committed if there are not errors.
func (m *RecipeImageModel) Delete(id int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified image from the backing store and database
// using the specified transaction.
func (m *RecipeImageModel) DeleteTx(id int64, tx *sqlx.Tx) error {
	image, err := m.ReadTx(id, tx)
	if err != nil {
		return err
	}

	origPath := filepath.Join(getDirPathForImage(image.RecipeID), image.Name)
	if err := m.upl.Delete(origPath); err != nil {
		return err
	}
	thumbPath := filepath.Join(getDirPathForThumbnail(image.RecipeID), image.Name)
	if err := m.upl.Delete(thumbPath); err != nil {
		return err
	}

	if _, err = tx.Exec("DELETE FROM recipe_image WHERE id = $1", id); err != nil {
		return err
	}

	// Switch to a new main image if necessary, since the image we just deleted may have been the main image
	return m.setMainImageIfNecessary(image.RecipeID, tx)
}

func (m *RecipeImageModel) setMainImageIfNecessary(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1)"+
			"WHERE id = $1 AND image_id IS NULL",
		recipeID)
	return err
}

// DeleteAll removes all images for the specified recipe from the database
// using a dedicated transation that is committed if there are not errors.
func (m *RecipeImageModel) DeleteAll(recipeID int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteAllTx(recipeID, tx)
	})
}

// DeleteAllTx removes all images for the specified recipe from the database
// using the specified transaction.
func (m *RecipeImageModel) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	dirPath := getDirPathForRecipe(recipeID)
	err := m.upl.DeleteAll(dirPath)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		"DELETE FROM recipe_image WHERE recipe_id = $1",
		recipeID)
	return err
}

func isImageFile(data []byte) (bool, string) {
	contentType := http.DetectContentType(data)
	if strings.Index(contentType, "image/") != -1 {
		return true, contentType
	}
	return false, ""
}

func getImageFormat(contentType string) imaging.Format {
	switch contentType {
	case "image/jpeg":
		return imaging.JPEG
	case "image/png":
		return imaging.PNG
	case "image/gif":
		return imaging.GIF
	case "image/bmp":
		return imaging.BMP
	case "image/tiff":
		return imaging.TIFF
	}
	return imaging.JPEG
}

func getDirPathForRecipe(recipeID int64) string {
	return filepath.Join("recipes", strconv.FormatInt(recipeID, 10))
}

func getDirPathForImage(recipeID int64) string {
	return filepath.Join(getDirPathForRecipe(recipeID), "images")
}

func getDirPathForThumbnail(recipeID int64) string {
	return filepath.Join(getDirPathForRecipe(recipeID), "thumbs")
}
