package api

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"path/filepath"

	"github.com/chadweimer/gomp/models"
	"github.com/google/uuid"
)

func (h apiHandler) GetImages(w http.ResponseWriter, r *http.Request, recipeId int64) {
	images, err := h.db.Images().List(recipeId)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, r, images)
}

func (h apiHandler) GetMainImage(w http.ResponseWriter, r *http.Request, recipeId int64) {
	image, err := h.db.Images().ReadMainImage(recipeId)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, r, image)
}

func (h apiHandler) SetMainImage(w http.ResponseWriter, r *http.Request, recipeId int64) {
	var imageId int64
	if err := readJSONFromRequest(r, &imageId); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	image := models.RecipeImage{Id: &imageId, RecipeId: &recipeId}
	if err := h.db.Images().UpdateMainImage(&image); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}
func (h apiHandler) UploadImage(w http.ResponseWriter, r *http.Request, recipeId int64) {
	file, fileHeader, err := r.FormFile("file_content")
	if err != nil {
		fullErr := fmt.Errorf("failed to read file_content from POSTed image: %w", err)
		h.Error(w, r, http.StatusBadRequest, fullErr)
		return
	}
	defer file.Close()

	uploadedFileData, err := ioutil.ReadAll(file)
	if err != nil {
		fullErr := fmt.Errorf("failed to read bytes from POSTed image: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	// Generate a unique name for the image
	imageExt := filepath.Ext(fileHeader.Filename)
	imageName := uuid.New().String() + imageExt

	// Save the image itself
	url, thumbUrl, err := h.upl.Save(recipeId, imageName, uploadedFileData)
	if err != nil {
		fullErr := fmt.Errorf("failed to save image file: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	imageInfo := models.RecipeImage{
		RecipeId:     &recipeId,
		Name:         &imageName,
		Url:          &url,
		ThumbnailUrl: &thumbUrl,
	}

	// Now insert the record in the database
	if err = h.db.Images().Create(&imageInfo); err != nil {
		fullErr := fmt.Errorf("failed to insert image database record: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	h.Created(w, r, imageInfo)
}

func (h apiHandler) DeleteImage(w http.ResponseWriter, r *http.Request, recipeId, imageId int64) {
	// We need to read the info about the image for later
	image, err := h.db.Images().Read(recipeId, imageId)
	if err != nil {
		fullErr := fmt.Errorf("failed to get image database record: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	// Now delete the record from the database
	if err := h.db.Images().Delete(recipeId, imageId); err != nil {
		fullErr := fmt.Errorf("failed to delete image database record: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	// And lastly delete the image file itself
	if err := h.upl.Delete(recipeId, *image.Name); err != nil {
		fullErr := fmt.Errorf("failed to delete image file: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	h.NoContent(w)
}
