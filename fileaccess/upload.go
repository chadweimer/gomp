package fileaccess

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"io/fs"
	"path/filepath"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"

	_ "image/gif" // Register GIF format
	_ "image/png" // Register PNG format

	_ "golang.org/x/image/bmp" // Register BMP format
	"golang.org/x/image/draw"
	_ "golang.org/x/image/tiff" // Register TIFF format
	_ "golang.org/x/image/webp" // Register WEBP format
)

// ---- Begin Standard Errors ----

// ErrInvalidContentType indicates that the uploaded file is not an image
var ErrInvalidContentType = errors.New("image is not in a supported format")

// ---- End Standard Errors ----

// ImageUploader represents an object to handle image uploads
type ImageUploader struct {
	driver Driver
	imgCfg ImageConfig
}

// SaveResult represents the result of saving an uploaded image
type SaveResult struct {
	// Name is the filename of the saved image
	Name string
	// URL is the URL to access the image
	URL string
	// ThumbnailURL is the URL to access the thumbnail image
	ThumbnailURL string
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
func (u ImageUploader) Save(recipeID int64, imageName string, data []byte) (result *SaveResult, err error) {
	// Make sure the file extension is for a JPEG
	imageExt := filepath.Ext(imageName)
	switch imageExt {
	case ".jpeg", ".jpg":
		// Nothing to do; leave it as-is
	default:
		imageName = imageName[0:len(imageName)-len(imageExt)] + ".jpeg"
	}

	// First decode the image
	dataReader := bytes.NewReader(data)
	original, format, err := image.Decode(dataReader)
	// QUESTION: Do we need to auto-detect EXIF orientation and rotate the image accordingly?
	if err != nil {
		if errors.Is(err, image.ErrFormat) {
			return nil, ErrInvalidContentType
		}
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	var imageURL string
	imgDir := getDirPathForImage(recipeID)
	if format == "jpeg" && u.imgCfg.ImageQuality == models.ImageQualityOriginal {
		// Save the original as-is
		imageURL, err = u.saveImage(dataReader, imgDir, imageName)
	} else {
		// Resize and save as jpeg
		imageURL, err = u.generateFitted(data, format, original, imgDir, imageName)
	}
	if err != nil {
		return nil, err
	}

	// And generate a thumbnail and save it
	thumbURL, err := u.generateThumbnail(data, format, original, getDirPathForThumbnail(recipeID), imageName)
	if err != nil {
		return nil, err
	}

	return &SaveResult{
		Name:         imageName,
		URL:          imageURL,
		ThumbnailURL: thumbURL,
	}, nil
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

// ListAll returns a map of recipe IDs to their corresponding image names for which images exist in the upload store.
func (u ImageUploader) ListAll() (map[int64][]string, error) {
	result := make(map[int64][]string)
	dirPath := getDirPathForRecipes()
	entries, err := u.driver.List(dirPath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return result, nil
		}
		return nil, fmt.Errorf("failed to list recipes: %w", err)
	}

	recipeIDs := lo.FilterMap(entries, func(entry fs.DirEntry, _ int) (int64, bool) {
		if !entry.IsDir() {
			return 0, false
		}

		if recipeID, err := strconv.ParseInt(entry.Name(), 10, 64); err == nil {
			return recipeID, true
		}

		return 0, false
	})

	for _, recipeID := range recipeIDs {
		images, err := u.List(recipeID)
		if err != nil {
			return nil, err
		}
		result[recipeID] = images
	}
	return result, nil
}

// List returns a list of image names for the specified recipe
func (u ImageUploader) List(recipeID int64) ([]string, error) {
	dirPath := getDirPathForImage(recipeID)
	entries, err := u.driver.List(dirPath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return []string{}, nil
		}
		return nil, fmt.Errorf("failed to list images for recipe %d: %w", recipeID, err)
	}

	return lo.FilterMap(entries, func(entry fs.DirEntry, _ int) (string, bool) {
		if entry.IsDir() {
			return "", false
		}
		return entry.Name(), true
	}), nil
}

// Load reads the image for the given recipe, returning the bytes of the file
func (u ImageUploader) Load(recipeID int64, imageName string) ([]byte, error) {
	origPath := filepath.Join(getDirPathForImage(recipeID), imageName)
	return fs.ReadFile(u.driver, origPath)
}

func (u ImageUploader) generateThumbnail(raw []byte, format string, original image.Image, saveDir string, imageName string) (string, error) {
	rotatedImage := rotateImage(raw, format, original)
	resize, crop := cover(rotatedImage.Bounds(), u.imgCfg.ThumbnailSize)
	resizedImage := resizeImage(rotatedImage, resize, getScaler(u.imgCfg.ThumbnailQuality))
	croppedImage := resizedImage.SubImage(crop)

	thumbBuf := new(bytes.Buffer)
	err := jpeg.Encode(thumbBuf, croppedImage, getJPEGOptions(u.imgCfg.ThumbnailQuality))
	if err != nil {
		return "", fmt.Errorf("failed to encode thumbnail image: %w", err)
	}

	return u.saveImage(bytes.NewReader(thumbBuf.Bytes()), saveDir, imageName)
}

func (u ImageUploader) generateFitted(raw []byte, format string, original image.Image, saveDir string, imageName string) (string, error) {
	var fittedImage image.Image

	bounds := original.Bounds()
	if u.imgCfg.ImageQuality == models.ImageQualityOriginal ||
		(bounds.Dx() <= u.imgCfg.ImageSize && bounds.Dy() <= u.imgCfg.ImageSize) {
		fittedImage = original
	} else {
		rotatedImage := rotateImage(raw, format, original)
		resize := fit(rotatedImage.Bounds(), u.imgCfg.ImageSize)
		fittedImage = resizeImage(rotatedImage, resize, getScaler(u.imgCfg.ImageQuality))
	}

	fittedBuf := new(bytes.Buffer)
	err := jpeg.Encode(fittedBuf, fittedImage, getJPEGOptions(u.imgCfg.ImageQuality))
	if err != nil {
		return "", fmt.Errorf("failed to encode fitted image: %w", err)
	}

	return u.saveImage(bytes.NewReader(fittedBuf.Bytes()), saveDir, imageName)
}

func (u ImageUploader) saveImage(reader io.ReadSeeker, baseDir string, imageName string) (string, error) {
	fullPath := filepath.Join(baseDir, imageName)
	url := filepath.ToSlash(filepath.Join("/", fullPath))
	err := u.driver.Save(fullPath, reader)
	if err != nil {
		return "", fmt.Errorf("failed to save image to '%s' using configured upload driver: %w", fullPath, err)
	}
	return url, nil
}

func getDirPathForRecipes() string {
	return filepath.Join(UploadDirectoryName, "recipes")
}

func getDirPathForRecipe(recipeID int64) string {
	return filepath.Join(getDirPathForRecipes(), strconv.FormatInt(recipeID, 10))
}

func getDirPathForImage(recipeID int64) string {
	return filepath.Join(getDirPathForRecipe(recipeID), "images")
}

func getDirPathForThumbnail(recipeID int64) string {
	return filepath.Join(getDirPathForRecipe(recipeID), "thumbs")
}

func getScaler(quality models.ImageQualityLevel) draw.Scaler {
	switch quality {
	case models.ImageQualityMedium:
		return draw.BiLinear
	case models.ImageQualityLow:
		return draw.NearestNeighbor
	default:
		return draw.CatmullRom
	}
}

func getJPEGOptions(quality models.ImageQualityLevel) *jpeg.Options {
	switch quality {
	case models.ImageQualityMedium:
		return &jpeg.Options{Quality: 80}
	case models.ImageQualityLow:
		return &jpeg.Options{Quality: 70}
	default:
		return &jpeg.Options{Quality: 92}
	}
}
