package upload

import (
	"bytes"
	"fmt"
	"image"
	"io/ioutil"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/rs/zerolog/log"
)

// Save saves the uploaded image, including generating a thumbnail,
// to the upload store.
func Save(driver Driver, recipeId int64, imageName string, data []byte) (string, string, error) {
	ok, contentType := isImageFile(data)
	if !ok {
		return "", "", fmt.Errorf("attachment must be an image; content type: %s ", contentType)
	}

	// First decode the image
	dataReader := bytes.NewReader(data)
	original, err := imaging.Decode(dataReader, imaging.AutoOrientation(true))
	if err != nil {
		return "", "", fmt.Errorf("failed to decode image: %w", err)
	}

	// Then resize and save it
	origUrl, err := generateFitted(original, contentType, getDirPathForImage(recipeId), imageName, driver)
	if err != nil {
		return "", "", err
	}

	// And generate a thumbnail and save it
	thumbUrl, err := generateThumbnail(original, contentType, getDirPathForThumbnail(recipeId), imageName, driver)
	if err != nil {
		return "", "", err
	}

	return origUrl, thumbUrl, nil
}

// Delete removes the specified image files from the upload store.
func Delete(driver Driver, recipeId int64, imageName string) error {
	origPath := filepath.Join(getDirPathForImage(recipeId), imageName)
	if err := driver.Delete(origPath); err != nil {
		return err
	}
	thumbPath := filepath.Join(getDirPathForThumbnail(recipeId), imageName)
	return driver.Delete(thumbPath)
}

// DeleteAll removes all image files for the specified recipe from the upload store.
func DeleteAll(driver Driver, recipeId int64) error {
	dirPath := getDirPathForRecipe(recipeId)
	err := driver.DeleteAll(dirPath)

	return err
}

// OptimizeImages regenerates all images and thumbnails from the currently saved originals
func OptimizeImages(driver Driver, recipeId int64) error {
	recipePath := getDirPathForImage(recipeId)
	imagePaths, err := driver.List(recipePath)
	if err != nil {
		return err
	}

	for _, imagePath := range imagePaths {
		file, err := driver.Open(imagePath)
		if err != nil {
			// TODO: Log and move on?
			return err
		}

		stat, err := file.Stat()
		if err != nil {
			// TODO: Log and move on?
			return err
		}
		log.Debug().Msg(stat.Name())

		origData, err := ioutil.ReadAll(file)
		_, _, err = Save(driver, recipeId, stat.Name(), origData)
		if err != nil {
			// TODO: Log and move on?
			return err
		}
	}

	return nil
}

func generateThumbnail(original image.Image, contentType string, saveDir string, imageName string, driver Driver) (string, error) {
	thumbImage := imaging.Thumbnail(original, 500, 500, imaging.Box)

	thumbBuf := new(bytes.Buffer)
	err := imaging.Encode(thumbBuf, thumbImage, getImageFormat(contentType), imaging.JPEGQuality(80))
	if err != nil {
		return "", fmt.Errorf("failed to encode thumbnail image: %w", err)
	}

	return saveImage(thumbBuf.Bytes(), saveDir, imageName, driver)
}

func generateFitted(original image.Image, contentType string, saveDir string, imageName string, driver Driver) (string, error) {
	var fittedImage image.Image

	bounds := original.Bounds()
	if bounds.Dx() <= 2000 && bounds.Dy() <= 2000 {
		fittedImage = original
	} else {
		fittedImage = imaging.Fit(original, 2000, 2000, imaging.Box)
	}

	fittedBuf := new(bytes.Buffer)
	err := imaging.Encode(fittedBuf, fittedImage, getImageFormat(contentType), imaging.JPEGQuality(92))
	if err != nil {
		return "", fmt.Errorf("failed to encode fitted image: %w", err)
	}

	return saveImage(fittedBuf.Bytes(), saveDir, imageName, driver)
}

func saveImage(data []byte, baseDir string, imageName string, driver Driver) (string, error) {
	fullPath := filepath.Join(baseDir, imageName)
	url := filepath.ToSlash(filepath.Join("/uploads/", fullPath))
	err := driver.Save(fullPath, data)
	if err != nil {
		return "", fmt.Errorf("failed to save image to '%s' using configured upload driver: %w", fullPath, err)
	}
	return url, nil
}

func isImageFile(data []byte) (bool, string) {
	contentType := http.DetectContentType(data)
	if strings.Contains(contentType, "image/") {
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

func getDirPathForRecipe(recipeId int64) string {
	return filepath.Join("recipes", strconv.FormatInt(recipeId, 10))
}

func getDirPathForImage(recipeId int64) string {
	return filepath.Join(getDirPathForRecipe(recipeId), "images")
}

func getDirPathForThumbnail(recipeId int64) string {
	return filepath.Join(getDirPathForRecipe(recipeId), "thumbs")
}
