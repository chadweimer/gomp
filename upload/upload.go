package upload

import (
	"bytes"
	"fmt"
	"image"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/disintegration/imaging"
)

// Save saves the uploaded image, including generating a thumbnail,
// to the upload store.
func Save(driver Driver, recipeID int64, imageName string, data []byte) (string, string, error) {
	ok, contentType := isImageFile(data)
	if !ok {
		return "", "", fmt.Errorf("attachment must be an image; content type: %s ", contentType)
	}

	// First decode the image
	dataReader := bytes.NewReader(data)
	image, err := imaging.Decode(dataReader, imaging.AutoOrientation(true))
	if err != nil {
		return "", "", fmt.Errorf("failed to decode image: %v", err)
	}

	// Then generate a thumbnail image
	thumbData, err := generateThumbnail(image, contentType)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate thumbnail image: %v", err)
	}

	// Save the original image
	origDir := getDirPathForImage(recipeID)
	origPath := filepath.Join(origDir, imageName)
	origURL := filepath.ToSlash(filepath.Join("/uploads/", origPath))
	err = driver.Save(origPath, data)
	if err != nil {
		return "", "", fmt.Errorf("failed to save image using configured upload driver: %v", err)
	}

	// Save the thumbnail image
	thumbDir := getDirPathForThumbnail(recipeID)
	thumbPath := filepath.Join(thumbDir, imageName)
	thumbURL := filepath.ToSlash(filepath.Join("/uploads/", thumbPath))
	err = driver.Save(thumbPath, thumbData)
	if err != nil {
		return "", "", fmt.Errorf("failed to save thumbnail image using configured upload driver: %v", err)
	}

	return origURL, thumbURL, nil
}

func generateThumbnail(image image.Image, contentType string) ([]byte, error) {
	thumbImage := imaging.Thumbnail(image, 500, 500, imaging.NearestNeighbor)

	thumbBuf := new(bytes.Buffer)
	err := imaging.Encode(thumbBuf, thumbImage, getImageFormat(contentType), imaging.JPEGQuality(80))
	if err != nil {
		return nil, fmt.Errorf("failed to encode thumbnail image: %v", err)
	}

	return thumbBuf.Bytes(), nil
}

// Delete removes the specified image files from the upload store.
func Delete(driver Driver, recipeID int64, imageName string) error {
	origPath := filepath.Join(getDirPathForImage(recipeID), imageName)
	if err := driver.Delete(origPath); err != nil {
		return err
	}
	thumbPath := filepath.Join(getDirPathForThumbnail(recipeID), imageName)
	if err := driver.Delete(thumbPath); err != nil {
		return err
	}

	return nil
}

// DeleteAll removes all image files for the specified recipe from the upload store.
func DeleteAll(driver Driver, recipeID int64) error {
	dirPath := getDirPathForRecipe(recipeID)
	err := driver.DeleteAll(dirPath)

	return err
}

func isImageFile(data []byte) (bool, string) {
	contentType := http.DetectContentType(data)
	if strings.Index(contentType, "image/") != -1 {
		return true, contentType
	}
	return false, contentType
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
