package models

import (
	"errors"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/disintegration/imaging"
)

type RecipeImage struct {
	RecipeID     int64
	URL          string
	ThumbnailURL string
}

type RecipeImages []RecipeImage

func (img *RecipeImage) Create(name string, data []byte) error {
	if ok := isImageFile(data); !ok {
		return errors.New("Attachment must be an image")
	}

	// Write the full size file
	dir := getDirPathForImage(img.RecipeID)
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
	thumbDir := getDirPathForThumbnail(img.RecipeID)
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
	return imaging.Save(thumbImage, thumbPath)
}

func (imgs *RecipeImages) List(recipeID int64) error {
	dir := getDirPathForImage(recipeID)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return nil
	}

	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return err
	}

	// TODO: Restrict based on file extension?
	for _, file := range files {
		if !file.IsDir() {
			filePath := filepath.Join(dir, file.Name())
			fileURL := getURLForImage(filePath)

			img := RecipeImage{
				RecipeID: recipeID,
				URL:      fileURL,
			}

			thumbPath := filepath.Join(getDirPathForThumbnail(recipeID), file.Name())
			if _, err := os.Stat(thumbPath); err == nil {
				img.ThumbnailURL = getURLForImage(thumbPath)
			}

			*imgs = append(*imgs, img)
		}
	}

	return nil
}

func isImageFile(data []byte) bool {
	contentType := http.DetectContentType(data)
	if strings.Index(contentType, "image/") != -1 {
		return true
	}
	return false
}

func getDirPathForImage(recipeID int64) string {
	return filepath.Join(conf.C.DataPath, "files", "recipes", strconv.FormatInt(recipeID, 10), "images")
}

func getDirPathForThumbnail(recipeID int64) string {
	return filepath.Join(conf.C.DataPath, "files", "recipes", strconv.FormatInt(recipeID, 10), "thumbs")
}

func getURLForImage(path string) string {
	return strings.TrimPrefix(path, conf.C.DataPath)
}
