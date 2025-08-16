package fileaccess

import (
	"bytes"
	"fmt"
	"image"
	"io"
	"io/fs"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/disintegration/imaging"
)

// RootUploadPath is the root directory for uploads
const RootUploadPath = "uploads"

// ImageUploader represents an object to handle image uploads
type ImageUploader struct {
	driver Driver
	imgCfg ImageConfig
}

// CreateImageUploader returns an ImageUploader implementation that uses the specified Driver
func CreateImageUploader(driver Driver, imgCfg ImageConfig) (*ImageUploader, error) {
	if err := imgCfg.validate(); err != nil {
		return nil, err
	}
	return &ImageUploader{driver, imgCfg}, nil
}

// Save saves the uploaded image, including generating a thumbnail,
// to the upload store.
func (u ImageUploader) Save(recipeID int64, imageName string, data []byte) (originalURL, thumbnailURL string, err error) {
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
	var origURL string
	imgDir := getDirPathForImage(recipeID)
	if u.imgCfg.ImageQuality == ImageQualityOriginal {
		// Save the original as-is
		origURL, err = u.saveImage(dataReader, imgDir, imageName)
	} else {
		// Resize and save
		origURL, err = u.generateFitted(original, contentType, imgDir, imageName)
	}
	if err != nil {
		return "", "", err
	}

	// And generate a thumbnail and save it
	thumbURL, err := u.generateThumbnail(original, contentType, getDirPathForThumbnail(recipeID), imageName)
	if err != nil {
		return "", "", err
	}

	return origURL, thumbURL, nil
}

// Delete removes the specified image files from the upload store.
func (u ImageUploader) Delete(recipeID int64, imageName string) error {
	origPath := filepath.Join(getDirPathForImage(recipeID), imageName)
	if err := u.driver.Delete(origPath); err != nil {
		return err
	}
	thumbPath := filepath.Join(getDirPathForThumbnail(recipeID), imageName)
	return u.driver.Delete(thumbPath)
}

// DeleteAll removes all image files for the specified recipe from the upload store.
func (u ImageUploader) DeleteAll(recipeID int64) error {
	dirPath := getDirPathForRecipe(recipeID)
	err := u.driver.DeleteAll(dirPath)

	return err
}

// Load reads the image for the given recipe, returning the bytes of the file
func (u ImageUploader) Load(recipeID int64, imageName string) ([]byte, error) {
	origPath := filepath.Join(getDirPathForImage(recipeID), imageName)
	return fs.ReadFile(u.driver, origPath)
}

func (u ImageUploader) generateThumbnail(original image.Image, contentType string, saveDir string, imageName string) (string, error) {
	thumbImage := imaging.Thumbnail(original, u.imgCfg.ThumbnailSize, u.imgCfg.ThumbnailSize, toResampleFilter(u.imgCfg.ThumbnailQuality))

	thumbBuf := new(bytes.Buffer)
	err := imaging.Encode(thumbBuf, thumbImage, getImageFormat(contentType), imaging.JPEGQuality(toJPEGQuality(u.imgCfg.ThumbnailQuality)))
	if err != nil {
		return "", fmt.Errorf("failed to encode thumbnail image: %w", err)
	}

	return u.saveImage(bytes.NewReader(thumbBuf.Bytes()), saveDir, imageName)
}

func (u ImageUploader) generateFitted(original image.Image, contentType string, saveDir string, imageName string) (string, error) {
	var fittedImage image.Image

	bounds := original.Bounds()
	if bounds.Dx() <= u.imgCfg.ImageSize && bounds.Dy() <= u.imgCfg.ImageSize {
		fittedImage = original
	} else {
		fittedImage = imaging.Fit(original, u.imgCfg.ImageSize, u.imgCfg.ImageSize, toResampleFilter(u.imgCfg.ImageQuality))
	}

	fittedBuf := new(bytes.Buffer)
	err := imaging.Encode(fittedBuf, fittedImage, getImageFormat(contentType), imaging.JPEGQuality(toJPEGQuality(u.imgCfg.ImageQuality)))
	if err != nil {
		return "", fmt.Errorf("failed to encode fitted image: %w", err)
	}

	return u.saveImage(bytes.NewReader(fittedBuf.Bytes()), saveDir, imageName)
}

func (u ImageUploader) saveImage(reader io.ReadSeeker, baseDir string, imageName string) (string, error) {
	fullPath := filepath.Join(baseDir, imageName)
	url := filepath.ToSlash(filepath.Join("/", RootUploadPath, fullPath))
	err := u.driver.Save(fullPath, reader)
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

func getDirPathForRecipe(recipeID int64) string {
	return filepath.Join("recipes", strconv.FormatInt(recipeID, 10))
}

func getDirPathForImage(recipeID int64) string {
	return filepath.Join(RootUploadPath, getDirPathForRecipe(recipeID), "images")
}

func getDirPathForThumbnail(recipeID int64) string {
	return filepath.Join(RootUploadPath, getDirPathForRecipe(recipeID), "thumbs")
}

func toResampleFilter(q ImageQualityLevel) imaging.ResampleFilter {
	switch q {
	case ImageQualityHigh:
		return imaging.Box
	case ImageQualityMedium:
		return imaging.Box
	case ImageQualityLow:
		return imaging.NearestNeighbor
	default:
		return imaging.Box
	}
}

func toJPEGQuality(q ImageQualityLevel) int {
	switch q {
	case ImageQualityHigh:
		return 92
	case ImageQualityMedium:
		return 80
	case ImageQualityLow:
		return 70
	default:
		return 92
	}
}
