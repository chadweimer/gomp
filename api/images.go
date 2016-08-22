package api

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getRecipeImages(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}

	images, err := h.model.Images.List(recipeID)
	if err != nil {
		panic(err)
	}

	h.writeJSONToResponse(resp, images)
}

func (h apiHandler) getRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}

	image, err := h.model.Images.ReadMainImage(recipeID)
	if err == models.ErrNotFound {
		h.writeErrorToResponse(resp, http.StatusNotFound, err)
		return
	}
	if err != nil {
		panic(err)
	}

	h.writeJSONToResponse(resp, image)
}

func (h apiHandler) putRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}

	var imageID int64
	if err := h.readJSONFromRequest(req, &imageID); err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}

	image := models.RecipeImage{ID: imageID, RecipeID: recipeID}
	if err := h.model.Images.UpdateMainImage(&image); err != nil {
		panic(err)
	}

	resp.WriteHeader(http.StatusNoContent)
}
func (h apiHandler) postImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}

	file, fileHeader, err := req.FormFile("file_content")
	if err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}
	defer file.Close()

	uploadedFileData, err := ioutil.ReadAll(file)
	if err != nil {
		panic(err)
	}

	imageInfo := &models.RecipeImage{
		RecipeID: recipeID,
		Name:     fileHeader.Filename,
	}
	err = h.model.Images.Create(imageInfo, uploadedFileData)
	if err != nil {
		panic(err)
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/recipes/%d/images/%d", imageInfo.RecipeID, imageInfo.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (h apiHandler) deleteImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	imageID, err := strconv.ParseInt(p.ByName("imageID"), 10, 64)
	if err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}

	if err := h.model.Images.Delete(imageID); err != nil {
		panic(err)
	}

	resp.WriteHeader(http.StatusOK)
}
