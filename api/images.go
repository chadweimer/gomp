package api

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getRecipeImages(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	images, err := h.db.Images().List(recipeID)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, images)
}

func (h apiHandler) getRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	image, err := h.db.Images().ReadMainImage(recipeID)
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

func (h apiHandler) putRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var imageID int64
	if err := readJSONFromRequest(req, &imageID); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	image := models.RecipeImage{ID: imageID, RecipeID: recipeID}
	if err := h.db.Images().UpdateMainImage(&image); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
func (h apiHandler) postRecipeImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeIDStr := p.ByName("recipeID")
	recipeID, err := strconv.ParseInt(recipeIDStr, 10, 64)
	if err != nil {
		fullErr := fmt.Errorf("failed to parse recipeID from URL, value = %s: %v", recipeIDStr, err)
		h.Error(resp, http.StatusBadRequest, fullErr)
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
	url, thumbURL, err := upload.Save(h.upl, recipeID, imageName, uploadedFileData)
	if err != nil {
		fullErr := fmt.Errorf("failed to save image file: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	imageInfo := &models.RecipeImage{
		RecipeID:     recipeID,
		Name:         imageName,
		URL:          url,
		ThumbnailURL: thumbURL,
	}

	// Now insert the record in the database
	if err = h.db.Images().Create(imageInfo); err != nil {
		fullErr := fmt.Errorf("failed to insert image database record: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.Created(resp, fmt.Sprintf("/api/v1/recipes/%d/images/%d", imageInfo.RecipeID, imageInfo.ID))
}

func (h apiHandler) deleteImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	imageID, err := strconv.ParseInt(p.ByName("imageID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	// We need to read the info about the image for later
	image, err := h.db.Images().Read(imageID)
	if err != nil {
		fullErr := fmt.Errorf("failed to get image database record: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	// Now delete the record from the database
	if err := h.db.Images().Delete(imageID); err != nil {
		fullErr := fmt.Errorf("failed to delete image database record: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	// And lastly delete the image file itself
	if err := upload.Delete(h.upl, image.RecipeID, image.Name); err != nil {
		fullErr := fmt.Errorf("failed to delete image file: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.NoContent(resp)
}
