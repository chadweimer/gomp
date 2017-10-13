package api

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
	uuid "github.com/satori/go.uuid"
)

func (h apiHandler) getRecipeImages(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	images, err := h.model.Images.List(recipeID)
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

	image, err := h.model.Images.ReadMainImage(recipeID)
	if err == models.ErrNotFound {
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
	if err := h.model.Images.UpdateMainImage(&image); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}
func (h apiHandler) postImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	file, fileHeader, err := req.FormFile("file_content")
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}
	defer file.Close()

	uploadedFileData, err := ioutil.ReadAll(file)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	// Generate a unique name for the image
	imageExt := filepath.Ext(fileHeader.Filename)
	imageName := uuid.NewV4().String() + imageExt

	imageInfo := &models.RecipeImage{
		RecipeID: recipeID,
		Name:     imageName,
	}
	err = h.model.Images.Create(imageInfo, uploadedFileData)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
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

	if err := h.model.Images.Delete(imageID); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusOK)
}
