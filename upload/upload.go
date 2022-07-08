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

	"github.com/chadweimer/gomp/models"
	"github.com/disintegration/imaging"
)

// ImageUploader represents an object to handle image uploads
type ImageUploader struct {
	Driver Driver
	imgCfg models.ImageConfiguration
}

// CreateImageUploader returns an ImageUploader implementation that uses the specified Driver
func CreateImageUploader(driver Driver, imgCfg models.ImageConfiguration) *ImageUploader {
	return &ImageUploader{driver, imgCfg}
}

// Save saves the uploaded image, including generating a thumbnail,
// to the upload store.
func (u ImageUploader) Save(recipeId int64, imageName string, data []byte) (string, string, error) {
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

	// Then determine if it should be resized before saving
	var origUrl string
	imgDir := getDirPathForImage(recipeId)
	if u.imgCfg.ImageQuality == models.ImageQualityOriginal {
		// Save the original as-is
		origUrl, err = u.saveImage(data, imgDir, imageName)
	} else {
		// Resize and save
		origUrl, err = u.generateFitted(original, contentType, imgDir, imageName)
	}
	if err != nil {
		return "", "", err
	}

	// And generate a thumbnail and save it
	thumbUrl, err := u.generateThumbnail(original, contentType, getDirPathForThumbnail(recipeId), imageName)
	if err != nil {
		return "", "", err
	}

	return origUrl, thumbUrl, nil
}

// Delete removes the specified image files from the upload store.
func (u ImageUploader) Delete(recipeId int64, imageName string) error {
	origPath := filepath.Join(getDirPathForImage(recipeId), imageName)
	if err := u.Driver.Delete(origPath); err != nil {
		return err
	}
	thumbPath := filepath.Join(getDirPathForThumbnail(recipeId), imageName)
	return u.Driver.Delete(thumbPath)
}

// DeleteAll removes all image files for the specified recipe from the upload store.
func (u ImageUploader) DeleteAll(recipeId int64) error {
	dirPath := getDirPathForRecipe(recipeId)
	err := u.Driver.DeleteAll(dirPath)

	return err
}

// Load reads the image for the given recipe, returning the bytes of the file
func (u ImageUploader) Load(recipeId int64, imageName string) ([]byte, error) {
	origPath := filepath.Join(getDirPathForImage(recipeId), imageName)

	file, err := u.Driver.Open(origPath)
	if err != nil {
		return nil, err
	}

	return ioutil.ReadAll(file)
}

func (u ImageUploader) generateThumbnail(original image.Image, contentType string, saveDir string, imageName string) (string, error) {
	thumbImage := imaging.Thumbnail(original, u.imgCfg.ThumnbailSize, u.imgCfg.ThumnbailSize, toReshapeFilter(u.imgCfg.ThumbnailQuality))

	thumbBuf := new(bytes.Buffer)
	err := imaging.Encode(thumbBuf, thumbImage, getImageFormat(contentType), imaging.JPEGQuality(toJPEGQuality(u.imgCfg.ThumbnailQuality)))
	if err != nil {
		return "", fmt.Errorf("failed to encode thumbnail image: %w", err)
	}

	return u.saveImage(thumbBuf.Bytes(), saveDir, imageName)
}

func (u ImageUploader) generateFitted(original image.Image, contentType string, saveDir string, imageName string) (string, error) {
	var fittedImage image.Image

	bounds := original.Bounds()
	if bounds.Dx() <= u.imgCfg.ImageSize && bounds.Dy() <= u.imgCfg.ImageSize {
		fittedImage = original
	} else {
		fittedImage = imaging.Fit(original, u.imgCfg.ImageSize, u.imgCfg.ImageSize, toReshapeFilter(u.imgCfg.ImageQuality))
	}

	fittedBuf := new(bytes.Buffer)
	err := imaging.Encode(fittedBuf, fittedImage, getImageFormat(contentType), imaging.JPEGQuality(toJPEGQuality(u.imgCfg.ImageQuality)))
	if err != nil {
		return "", fmt.Errorf("failed to encode fitted image: %w", err)
	}

	return u.saveImage(fittedBuf.Bytes(), saveDir, imageName)
}

func (u ImageUploader) saveImage(data []byte, baseDir string, imageName string) (string, error) {
	fullPath := filepath.Join(baseDir, imageName)
	url := filepath.ToSlash(filepath.Join("/uploads/", fullPath))
	err := u.Driver.Save(fullPath, data)
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

func toReshapeFilter(q models.ImageQualityLevel) imaging.ResampleFilter {
	switch q {
	case models.ImageQualityHigh:
		return imaging.Box
	case models.ImageQualityMedium:
		return imaging.Box
	case models.ImageQualityLow:
		return imaging.NearestNeighbor
	default:
		return imaging.Box
	}
}

func toJPEGQuality(q models.ImageQualityLevel) int {
	switch q {
	case models.ImageQualityHigh:
		return 92
	case models.ImageQualityMedium:
		return 80
	case models.ImageQualityLow:
		return 70
	default:
		return 92
	}
}
