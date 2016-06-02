package models

import (
	"errors"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/disintegration/imaging"
)

// RecipeImageModel provides functionality to edit and retrieve images attached to recipes
type RecipeImageModel struct {
	*Model
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

// Save saves the supplied image data as an attachment on the specified recipe
func (m *RecipeImageModel) Save(recipeID int64, name string, data []byte) error {
	if ok := isImageFile(data); !ok {
		return errors.New("Attachment must be an image")
	}

	// Write the full size file
	dir := getDirPathForImage(m.cfg.UploadPath, recipeID)
	err := os.MkdirAll(dir, os.ModePerm)
	if err != nil {
		return err
	}

	filePath := filepath.Join(dir, name)
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.Write(data)
	if err != nil {
		return err
	}

	// Generate the thumbnail
	thumbDir := getDirPathForThumbnail(m.cfg.UploadPath, recipeID)
	err = os.MkdirAll(thumbDir, os.ModePerm)
	if err != nil {
		return err
	}

	// load image and make 250x250 thumbnail
	thumbPath := filepath.Join(thumbDir, name)
	thumbFile, err := imaging.Open(filePath)
	if err != nil {
		return err
	}
	thumbImage := imaging.Thumbnail(thumbFile, 250, 250, imaging.CatmullRom)

	// save the thumbnail image to file
	err = imaging.Save(thumbImage, thumbPath)
	if err != nil {
		return err
	}

	return nil
}

// List returns a RecipeImages slice that contains data for all images
// attached to the specified recipe
func (m *RecipeImageModel) List(recipeID int64) (*RecipeImages, error) {
	dir := getDirPathForImage(m.cfg.UploadPath, recipeID)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return new(RecipeImages), nil
	}

	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	// TODO: Restrict based on file extension?
	var imgs RecipeImages
	for _, file := range files {
		if !file.IsDir() {
			filePath := filepath.Join(dir, file.Name())
			fileURL := getURLForImage(m.cfg.UploadPath, filePath)

			img := RecipeImage{
				RecipeID: recipeID,
				Name:     file.Name(),
				URL:      fileURL,
			}

			thumbPath := filepath.Join(getDirPathForThumbnail(m.cfg.UploadPath, recipeID), file.Name())
			if _, err := os.Stat(thumbPath); err == nil {
				img.ThumbnailURL = getURLForImage(m.cfg.UploadPath, thumbPath)
			}

			imgs = append(imgs, img)
		}
	}

	return &imgs, nil
}

// Delete deletes a single image attached to the specified recipe
func (m *RecipeImageModel) Delete(recipeID int64, name string) error {
	var mainImgPath = filepath.Join(getDirPathForImage(m.cfg.UploadPath, recipeID), name)
	if err := os.Remove(mainImgPath); err != nil {
		return err
	}
	var thumbImgPath = filepath.Join(getDirPathForThumbnail(m.cfg.UploadPath, recipeID), name)
	return os.Remove(thumbImgPath)
}

// DeleteAll deletes all the images attached to the specified recipe
func (m *RecipeImageModel) DeleteAll(recipeID int64) error {
	dir := getDirPathForRecipe(m.cfg.UploadPath, recipeID)
	return os.RemoveAll(dir)
}

func isImageFile(data []byte) bool {
	contentType := http.DetectContentType(data)
	if strings.Index(contentType, "image/") != -1 {
		return true
	}
	return false
}

func getDirPathForRecipe(uploadPath string, recipeID int64) string {
	return filepath.Join(uploadPath, "recipes", strconv.FormatInt(recipeID, 10))
}

func getDirPathForImage(uploadPath string, recipeID int64) string {
	return filepath.Join(getDirPathForRecipe(uploadPath, recipeID), "images")
}

func getDirPathForThumbnail(uploadPath string, recipeID int64) string {
	return filepath.Join(getDirPathForRecipe(uploadPath, recipeID), "thumbs")
}

func getURLForImage(uploadPath string, path string) string {
	return filepath.ToSlash(filepath.Join("/uploads", strings.TrimPrefix(path, uploadPath)))
}
