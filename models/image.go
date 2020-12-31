package models

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/chadweimer/gomp/upload"
	"github.com/disintegration/imaging"
)

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

// RecipeImageModel provides functionality to edit and retrieve images attached to recipes
type RecipeImageModel struct {
	upl upload.Driver
}

// Save saves the uploaded image, including generating a thumbnail,
// to the upload store.
func (m *RecipeImageModel) Save(imageInfo *RecipeImage, data []byte) (string, string, error) {
	ok, contentType := isImageFile(data)
	if !ok {
		return "", "", errors.New("attachment must be an image")
	}

	// First decode the image
	dataReader := bytes.NewReader(data)
	image, err := imaging.Decode(dataReader, imaging.AutoOrientation(true))
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

// Delete removes the specified image files from the upload store.
func (m *RecipeImageModel) Delete(image *RecipeImage) error {
	origPath := filepath.Join(getDirPathForImage(image.RecipeID), image.Name)
	if err := m.upl.Delete(origPath); err != nil {
		return err
	}
	thumbPath := filepath.Join(getDirPathForThumbnail(image.RecipeID), image.Name)
	if err := m.upl.Delete(thumbPath); err != nil {
		return err
	}

	return nil
}

// DeleteAll removes all image files for the specified recipe from the upload store.
func (m *RecipeImageModel) DeleteAll(recipeID int64) error {
	dirPath := getDirPathForRecipe(recipeID)
	err := m.upl.DeleteAll(dirPath)

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
