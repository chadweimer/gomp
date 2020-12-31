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
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	images, err := h.db.Images().List(recipeID)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, images)
}

func (h apiHandler) getRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	image, err := h.db.Images().ReadMainImage(recipeID)
	if err == db.ErrNotFound {
		h.JSON(resp, http.StatusNotFound, err.Error())
		return
	}
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, image)
}

func (h apiHandler) putRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	var imageID int64
	if err := readJSONFromRequest(req, &imageID); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	image := models.RecipeImage{ID: imageID, RecipeID: recipeID}
	if err := h.db.Images().UpdateMainImage(&image); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}
func (h apiHandler) postRecipeImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeIDStr := p.ByName("recipeID")
	recipeID, err := strconv.ParseInt(recipeIDStr, 10, 64)
	if err != nil {
		msg := fmt.Sprintf("failed to parse recipeID from URL, value = %s: %v", recipeIDStr, err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	file, fileHeader, err := req.FormFile("file_content")
	if err != nil {
		msg := fmt.Sprintf("failed to read file_content from POSTed image: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}
	defer file.Close()

	uploadedFileData, err := ioutil.ReadAll(file)
	if err != nil {
		msg := fmt.Sprintf("failed to read bytes from POSTed image: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
		return
	}

	// Generate a unique name for the image
	imageExt := filepath.Ext(fileHeader.Filename)
	imageName := uuid.New().String() + imageExt

	// Save the image itself
	url, thumbURL, err := upload.Save(h.upl, recipeID, imageName, uploadedFileData)
	if err != nil {
		msg := fmt.Sprintf("failed to save image file: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
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
		msg := fmt.Sprintf("failed to insert image database record: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/recipes/%d/images/%d", imageInfo.RecipeID, imageInfo.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (h apiHandler) deleteImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	imageID, err := strconv.ParseInt(p.ByName("imageID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	// We need to read the info about the image for later
	image, err := h.db.Images().Read(imageID)
	if err != nil {
		msg := fmt.Sprintf("failed to get image database record: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
		return
	}

	// Now delete the record from the database
	if err := h.db.Images().Delete(imageID); err != nil {
		msg := fmt.Sprintf("failed to delete image database record: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
		return
	}

	// And lastly delete the image file itself
	if err := upload.Delete(h.upl, image.RecipeID, image.Name); err != nil {
		msg := fmt.Sprintf("failed to delete image file: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
		return
	}

	resp.WriteHeader(http.StatusOK)
}
