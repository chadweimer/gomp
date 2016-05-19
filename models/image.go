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

type RecipeImageModel struct {
	*Model
}

type RecipeImage struct {
	RecipeID     int64
	URL          string
	ThumbnailURL string
}

type RecipeImages []RecipeImage

func (m *RecipeImageModel) Save(recipeID int64, name string, data []byte) error {
	if ok := isImageFile(data); !ok {
		return errors.New("Attachment must be an image")
	}

	// Write the full size file
	dir := getDirPathForImage(m.cfg.DataPath, recipeID)
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
	thumbDir := getDirPathForThumbnail(m.cfg.DataPath, recipeID)
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

func (m *RecipeImageModel) List(recipeID int64) (*RecipeImages, error) {
	dir := getDirPathForImage(m.cfg.DataPath, recipeID)
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
			fileURL := getURLForImage(m.cfg.DataPath, filePath)

			img := RecipeImage{
				RecipeID: recipeID,
				URL:      fileURL,
			}

			thumbPath := filepath.Join(getDirPathForThumbnail(m.cfg.DataPath, recipeID), file.Name())
			if _, err := os.Stat(thumbPath); err == nil {
				img.ThumbnailURL = getURLForImage(m.cfg.DataPath, thumbPath)
			}

			imgs = append(imgs, img)
		}
	}

	return &imgs, nil
}

func isImageFile(data []byte) bool {
	contentType := http.DetectContentType(data)
	if strings.Index(contentType, "image/") != -1 {
		return true
	}
	return false
}

func getDirPathForImage(dataPath string, recipeID int64) string {
	return filepath.Join(dataPath, "files", "recipes", strconv.FormatInt(recipeID, 10), "images")
}

func getDirPathForThumbnail(dataPath string, recipeID int64) string {
	return filepath.Join(dataPath, "files", "recipes", strconv.FormatInt(recipeID, 10), "thumbs")
}

func getURLForImage(dataPath string, path string) string {
	return filepath.ToSlash(strings.TrimPrefix(path, dataPath))
}
