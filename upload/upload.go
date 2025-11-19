package upload

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"math"
	"path/filepath"
	"strconv"

	"golang.org/x/image/draw"

	_ "image/gif" // Register GIF format
	_ "image/png" // Register PNG format

	_ "golang.org/x/image/bmp"  // Register BMP format
	_ "golang.org/x/image/tiff" // Register TIFF format
	_ "golang.org/x/image/webp" // Register WEBP format
)

// ---- Begin Standard Errors ----

// ErrInvalidContentType indicates that the uploaded file is not an image
var ErrInvalidContentType = errors.New("image is not in a supported format")

// ---- End Standard Errors ----

// ImageUploader represents an object to handle image uploads
type ImageUploader struct {
	Driver Driver
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
	if format == "jpeg" && u.imgCfg.ImageQuality == ImageQualityOriginal {
		// Save the original as-is
		imageURL, err = u.saveImage(data, imgDir, imageName)
	} else {
		// Resize and save as jpeg
		imageURL, err = u.generateFitted(original, imgDir, imageName)
	}
	if err != nil {
		return nil, err
	}

	// And generate a thumbnail and save it
	thumbURL, err := u.generateThumbnail(original, getDirPathForThumbnail(recipeID), imageName)
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
	if err := u.Driver.Delete(origPath); err != nil {
		return err
	}
	thumbPath := filepath.Join(getDirPathForThumbnail(recipeID), imageName)
	return u.Driver.Delete(thumbPath)
}

// DeleteAll removes all image files for the specified recipe from the upload store.
func (u ImageUploader) DeleteAll(recipeID int64) error {
	dirPath := getDirPathForRecipe(recipeID)
	err := u.Driver.DeleteAll(dirPath)

	return err
}

// Load reads the image for the given recipe, returning the bytes of the file
func (u ImageUploader) Load(recipeID int64, imageName string) ([]byte, error) {
	origPath := filepath.Join(getDirPathForImage(recipeID), imageName)

	file, err := u.Driver.Open(origPath)
	if err != nil {
		return nil, err
	}

	return io.ReadAll(file)
}

func (u ImageUploader) generateThumbnail(original image.Image, saveDir string, imageName string) (string, error) {
	r, c := cover(original.Bounds(), u.imgCfg.ThumbnailSize)
	resizedImage := resizeImage(original, r, getScaler(u.imgCfg.ThumbnailQuality))
	thumbImage := crop(resizedImage, c)

	thumbBuf := new(bytes.Buffer)
	err := jpeg.Encode(thumbBuf, thumbImage, getJPEGOptions(u.imgCfg.ThumbnailQuality))
	if err != nil {
		return "", fmt.Errorf("failed to encode thumbnail image: %w", err)
	}

	return u.saveImage(thumbBuf.Bytes(), saveDir, imageName)
}

func (u ImageUploader) generateFitted(original image.Image, saveDir string, imageName string) (string, error) {
	var fittedImage image.Image

	bounds := original.Bounds()
	if u.imgCfg.ImageQuality == ImageQualityOriginal ||
		(bounds.Dx() <= u.imgCfg.ImageSize && bounds.Dy() <= u.imgCfg.ImageSize) {
		fittedImage = original
	} else {
		r := fit(bounds, u.imgCfg.ImageSize)
		fittedImage = resizeImage(original, r, getScaler(u.imgCfg.ImageQuality))
	}

	fittedBuf := new(bytes.Buffer)
	err := jpeg.Encode(fittedBuf, fittedImage, getJPEGOptions(u.imgCfg.ImageQuality))
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

func getDirPathForRecipe(recipeID int64) string {
	return filepath.Join("recipes", strconv.FormatInt(recipeID, 10))
}

func getDirPathForImage(recipeID int64) string {
	return filepath.Join(getDirPathForRecipe(recipeID), "images")
}

func getDirPathForThumbnail(recipeID int64) string {
	return filepath.Join(getDirPathForRecipe(recipeID), "thumbs")
}

func fit(src image.Rectangle, size int) (resize image.Rectangle) {
	srcW := src.Dx()
	srcH := src.Dy()

	// Compute the two possible scale factors.
	scaleW := float64(size) / float64(srcW)
	scaleH := float64(size) / float64(srcH)

	// Pick the *smaller* factor so the whole image stays visible.
	scale := math.Min(scaleW, scaleH)

	newW := int(math.Round(float64(srcW) * scale))
	newH := int(math.Round(float64(srcH) * scale))
	return image.Rect(0, 0, newW, newH)
}

func cover(src image.Rectangle, size int) (resize image.Rectangle, crop image.Rectangle) {
	srcW := src.Dx()
	srcH := src.Dy()

	// Compute the two possible scale factors.
	scaleW := float64(size) / float64(srcW)
	scaleH := float64(size) / float64(srcH)

	// Pick the *larger* factor so the image fills the box.
	scale := math.Max(scaleW, scaleH)

	newW := int(math.Round(float64(srcW) * scale))
	newH := int(math.Round(float64(srcH) * scale))

	// Offsets for a centred crop.
	offsetX := (newW - size) / 2
	offsetY := (newH - size) / 2

	resize = image.Rect(0, 0, newW, newH)
	crop = image.Rect(offsetX, offsetY, size+offsetX, size+offsetY)
	return resize, crop
}

func resizeImage(src image.Image, box image.Rectangle, scaler draw.Scaler) *image.RGBA {
	dst := image.NewRGBA(box)
	scaler.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Src, nil)
	return dst
}

func crop(src *image.RGBA, r image.Rectangle) image.Image {
	// Ensure the rectangle lies inside src.Bounds().
	return src.SubImage(r)
}

func getScaler(quality ImageQualityLevel) draw.Scaler {
	switch quality {
	case ImageQualityMedium:
		return draw.BiLinear
	case ImageQualityLow:
		return draw.NearestNeighbor
	default:
		return draw.CatmullRom
	}
}

func getJPEGOptions(quality ImageQualityLevel) *jpeg.Options {
	switch quality {
	case ImageQualityMedium:
		return &jpeg.Options{Quality: 80}
	case ImageQualityLow:
		return &jpeg.Options{Quality: 70}
	default:
		return &jpeg.Options{Quality: 92}
	}
}
