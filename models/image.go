package models

import (
	"bytes"
	"errors"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/chadweimer/gomp/modules/upload"
	"github.com/disintegration/imaging"
	"github.com/rwcarlsen/goexif/exif"
)

// RecipeImageModel provides functionality to edit and retrieve images attached to recipes
type RecipeImageModel struct {
	*Model
	upl upload.Driver
}

// RecipeImage represents the data associated with an image attached to a recipe
type RecipeImage struct {
	RecipeID     int64
	Name         string
	URL          string
	ThumbnailURL string
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

// Save saves the supplied image data as an attachment on the specified recipe
func (m *RecipeImageModel) Save(recipeID int64, name string, data []byte) error {
	ok, contentType := isImageFile(data)
	if !ok {
		return errors.New("Attachment must be an image")
	}

	// First decode the image
	image, err := imaging.Decode(bytes.NewReader(data))
	if err != nil {
		return err
	}

	// Then generate a thumbnail image
	thumbImage := imaging.Thumbnail(image, 250, 250, imaging.CatmullRom)

	// Use the EXIF data to determine the orientation of the original image.
	// This data is lost when generating the thumbnail, so it's needed into
	// order to potentially explicitly rotate it.
	exifData, err := exif.Decode(bytes.NewReader(data))
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
		return err
	}

	// Save the original image
	origDir := getDirPathForImage(recipeID)
	origPath := filepath.Join(origDir, name)
	err = m.upl.Save(origPath, data)
	if err != nil {
		return err
	}

	// Save the thumbnail image
	thumbDir := getDirPathForThumbnail(recipeID)
	thumbPath := filepath.Join(thumbDir, name)
	err = m.upl.Save(thumbPath, thumbBuf.Bytes())
	return err
}

// List returns a RecipeImages slice that contains data for all images
// attached to the specified recipe
func (m *RecipeImageModel) List(recipeID int64) (*RecipeImages, error) {
	fileInfos, err := m.upl.List(getDirPathForRecipe(recipeID))
	if err != nil {
		return new(RecipeImages), err
	}

	// TODO: Restrict based on file extension?
	var imgs RecipeImages
	for _, fileInfo := range fileInfos {
		img := RecipeImage{
			RecipeID:     recipeID,
			Name:         fileInfo.Name,
			URL:          fileInfo.URL,
			ThumbnailURL: fileInfo.ThumbnailURL,
		}

		imgs = append(imgs, img)
	}

	return &imgs, nil
}

// Delete deletes a single image attached to the specified recipe
func (m *RecipeImageModel) Delete(recipeID int64, name string) error {
	var mainImgPath = filepath.Join(getDirPathForImage(recipeID), name)
	if err := m.upl.Delete(mainImgPath); err != nil {
		return err
	}
	var thumbImgPath = filepath.Join(getDirPathForThumbnail(recipeID), name)
	return m.upl.Delete(thumbImgPath)
}

// DeleteAll deletes all the images attached to the specified recipe
func (m *RecipeImageModel) DeleteAll(recipeID int64) error {
	dirPath := getDirPathForRecipe(recipeID)
	return m.upl.DeleteAll(dirPath)
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
