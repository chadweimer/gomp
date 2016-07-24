package models

import (
	"bytes"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/chadweimer/gomp/modules/upload"
	"github.com/disintegration/imaging"
	"github.com/jmoiron/sqlx"
	"github.com/rwcarlsen/goexif/exif"
)

// RecipeImageModel provides functionality to edit and retrieve images attached to recipes
type RecipeImageModel struct {
	*Model
	upl upload.Driver
}

// RecipeImage represents the data associated with an image attached to a recipe
type RecipeImage struct {
	ID           int64
	RecipeID     int64
	Name         string
	URL          string
	ThumbnailURL string
	CreatedAt    time.Time
	ModifiedAt   time.Time
}

// RecipeImages represents a collection of RecipeImage objects
type RecipeImages []RecipeImage

// NewRecipeImageModel constructs a RecipeImageModel
func NewRecipeImageModel(model *Model) *RecipeImageModel {
	var upl upload.Driver
	if model.cfg.UploadDriver == "fs" {
		upl = upload.NewFileSystemDriver(model.cfg)
	} else if model.cfg.UploadDriver == "s3" {
		upl = upload.NewS3Driver(model.cfg)
	} else {
		log.Fatalf("Invalid UploadDriver '%s' specified", model.cfg.UploadDriver)
	}

	return &RecipeImageModel{Model: model, upl: upl}
}

func (m *RecipeImageModel) migrateImages(recipeID int64, tx *sqlx.Tx) error {
	files, err := m.upl.List(getDirPathForRecipe(recipeID))
	if err != nil {
		return err
	}

	for _, file := range files {
		log.Printf("[migrate] Processing file %s", file.URL)
		image := &RecipeImage{
			RecipeID:     recipeID,
			Name:         file.Name,
			URL:          file.URL,
			ThumbnailURL: file.ThumbnailURL,
		}
		if err := m.createImpl(image, tx); err != nil {
			return err
		}
	}

	return nil
}

// Create saves the image using the backing upload.Driver and creates
// an associated record in the database using a dedicated transation
// that is committed if there are not errors.
func (m *RecipeImageModel) Create(imageInfo *RecipeImage, imageData []byte) error {
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	err = m.CreateTx(imageInfo, imageData, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// CreateTx saves the image using the backing upload.Driver and creates
// an associated record in the database using the specified transaction.
func (m *RecipeImageModel) CreateTx(imageInfo *RecipeImage, imageData []byte, tx *sqlx.Tx) error {
	origURL, thumbURL, err := m.save(imageInfo, imageData)
	if err != nil {
		return err
	}

	// Since uploading the image was successful, add a record to the DB
	imageInfo.URL = origURL
	imageInfo.ThumbnailURL = thumbURL
	return m.createImpl(imageInfo, tx)
}

func (m *RecipeImageModel) createImpl(image *RecipeImage, tx *sqlx.Tx) error {
	now := time.Now()
	sql := "INSERT INTO recipe_image (recipe_id, name, url, thumbnail_url, created_at, modified_at) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	var id int64
	row := tx.QueryRow(sql, image.RecipeID, image.Name, image.URL, image.ThumbnailURL, now, now)
	err := row.Scan(&id)
	if err != nil {
		return err
	}

	image.ID = id
	return nil
}

// Save saves the supplied image data as an attachment on the specified recipe
func (m *RecipeImageModel) save(imageInfo *RecipeImage, imageData []byte) (string, string, error) {
	ok, contentType := isImageFile(imageData)
	if !ok {
		return "", "", errors.New("Attachment must be an image")
	}

	// First decode the image
	image, err := imaging.Decode(bytes.NewReader(imageData))
	if err != nil {
		return "", "", err
	}

	// Then generate a thumbnail image
	thumbImage := imaging.Thumbnail(image, 250, 250, imaging.CatmullRom)

	// Use the EXIF data to determine the orientation of the original image.
	// This data is lost when generating the thumbnail, so it's needed into
	// order to potentially explicitly rotate it.
	exifData, err := exif.Decode(bytes.NewReader(imageData))
	if err == nil {
		orientationTag, err := exifData.Get(exif.Orientation)
		if err == nil {
			orientationVal, err := orientationTag.Int(0)
			if err == nil {
				switch orientationVal {
				case 3:
					if m.cfg.IsDevelopment {
						log.Printf("[imaging] Rotating thumbnail 180 degress")
					}
					thumbImage = imaging.Rotate180(thumbImage)
				case 6:
					if m.cfg.IsDevelopment {
						log.Printf("[imaging] Rotating thumbnail 270 degress")
					}
					thumbImage = imaging.Rotate270(thumbImage)
				case 8:
					if m.cfg.IsDevelopment {
						log.Printf("[imaging] Rotating thumbnail 90 degress")
					}
					thumbImage = imaging.Rotate90(thumbImage)
				}
			}
		}
	}
	thumbBuf := new(bytes.Buffer)
	err = imaging.Encode(thumbBuf, thumbImage, getImageFormat(contentType))
	if err != nil {
		return "", "", err
	}

	// Save the original image
	origDir := getDirPathForImage(imageInfo.RecipeID)
	origPath := filepath.Join(origDir, imageInfo.Name)
	origURL := filepath.ToSlash(filepath.Join("/uploads", origPath))
	err = m.upl.Save(origPath, imageData)
	if err != nil {
		return "", "", err
	}

	// Save the thumbnail image
	thumbDir := getDirPathForThumbnail(imageInfo.RecipeID)
	thumbPath := filepath.Join(thumbDir, imageInfo.Name)
	thumbURL := filepath.ToSlash(filepath.Join("/uploads", thumbPath))
	err = m.upl.Save(thumbPath, thumbBuf.Bytes())
	if err != nil {
		return "", "", err
	}

	return origURL, thumbURL, nil
}

// ReadTx retrieves the information about the recipe from the database, if found,
// using the specified transaction. If no recipe exists with the specified ID,
// a NoRecordFound error is returned.
func (m *RecipeImageModel) ReadTx(id int64, tx *sqlx.Tx) (*RecipeImage, error) {
	image := RecipeImage{ID: id}

	result := m.db.QueryRow(
		"SELECT recipe_id, name, url, thumbnail_url, created_at, modified_at FROM recipe_image WHERE id = $1",
		image.ID)
	err := result.Scan(
		&image.RecipeID,
		&image.Name,
		&image.URL,
		&image.ThumbnailURL,
		&image.CreatedAt,
		&image.ModifiedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return &image, nil
}

// List retrieves all images associated with the recipe with the specified id.
func (m *RecipeImageModel) List(recipeID int64) (*RecipeImages, error) {
	rows, err := m.db.Query(
		"SELECT id, name, url, thumbnail_url, created_at, modified_at FROM recipe_image "+
			"WHERE recipe_id = $1 ORDER BY created_at ASC",
		recipeID)
	if err != nil {
		return nil, err
	}

	var images RecipeImages
	for rows.Next() {
		var image RecipeImage
		err = rows.Scan(&image.ID, &image.Name, &image.URL, &image.ThumbnailURL, &image.CreatedAt, &image.ModifiedAt)
		if err != nil {
			return nil, err
		}
		images = append(images, image)
	}

	return &images, nil
}

// Delete removes the specified image from the backing store and database
// using a dedicated transation that is committed if there are not errors.
func (m *RecipeImageModel) Delete(id int64) error {
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	err = m.DeleteTx(id, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteTx removes the specified image from the backing store and database
// using the specified transaction.
func (m *RecipeImageModel) DeleteTx(id int64, tx *sqlx.Tx) error {
	image, err := m.ReadTx(id, tx)
	if err != nil {
		return err
	}

	var origPath = filepath.FromSlash(image.URL)
	if err := m.upl.Delete(origPath); err != nil {
		return err
	}
	var thumbPath = filepath.FromSlash(image.ThumbnailURL)
	if err := m.upl.Delete(thumbPath); err != nil {
		return err
	}

	_, err = tx.Exec("DELETE FROM recipe_image WHERE id = $1", id)
	return err
}

// DeleteAll removes all images for the specified recipe from the database
// using a dedicated transation that is committed if there are not errors.
func (m *RecipeImageModel) DeleteAll(recipeID int64) error {
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	err = m.DeleteAllTx(recipeID, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
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
		"DELETE FROM recipe_note WHERE recipe_id = $1",
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
