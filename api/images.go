package api

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"path/filepath"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/google/uuid"
)

func (h *apiHandler) getRecipeImages(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	images, err := h.db.Images().List(recipeId)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, images)
}

func (h *apiHandler) getRecipeMainImage(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	image, err := h.db.Images().ReadMainImage(recipeId)
	if err == db.ErrNotFound {
		h.Error(resp, http.StatusNotFound, err)
		return
	}
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, image)
}

func (h *apiHandler) putRecipeMainImage(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var imageId int64
	if err := readJSONFromRequest(req, &imageId); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	image := models.RecipeImage{Id: &imageId, RecipeId: recipeId}
	if err := h.db.Images().UpdateMainImage(&image); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
func (h *apiHandler) postRecipeImage(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	file, fileHeader, err := req.FormFile("file_content")
	if err != nil {
		fullErr := fmt.Errorf("failed to read file_content from POSTed image: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}
	defer file.Close()

	uploadedFileData, err := ioutil.ReadAll(file)
	if err != nil {
		fullErr := fmt.Errorf("failed to read bytes from POSTed image: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	// Generate a unique name for the image
	imageExt := filepath.Ext(fileHeader.Filename)
	imageName := uuid.New().String() + imageExt

	// Save the image itself
	url, thumbUrl, err := upload.Save(h.upl, recipeId, imageName, uploadedFileData)
	if err != nil {
		fullErr := fmt.Errorf("failed to save image file: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	imageInfo := &models.RecipeImage{
		RecipeId:     recipeId,
		Name:         imageName,
		Url:          url,
		ThumbnailUrl: thumbUrl,
	}

	// Now insert the record in the database
	if err = h.db.Images().Create(imageInfo); err != nil {
		fullErr := fmt.Errorf("failed to insert image database record: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.Created(resp, imageInfo)
}

func (h *apiHandler) deleteImage(resp http.ResponseWriter, req *http.Request) {
	imageId, err := getResourceIdFromUrl(req, imageIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	// We need to read the info about the image for later
	image, err := h.db.Images().Read(imageId)
	if err != nil {
		fullErr := fmt.Errorf("failed to get image database record: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	// Now delete the record from the database
	if err := h.db.Images().Delete(imageId); err != nil {
		fullErr := fmt.Errorf("failed to delete image database record: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	// And lastly delete the image file itself
	if err := upload.Delete(h.upl, image.RecipeId, image.Name); err != nil {
		fullErr := fmt.Errorf("failed to delete image file: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.NoContent(resp)
}
