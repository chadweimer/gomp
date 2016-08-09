package api

import (
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (r Router) GetRecipeImages(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	images, err := r.model.Images.List(recipeID)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, images)
}

func (r Router) GetRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	image, err := r.model.Images.ReadMainImage(recipeID)
	if err == models.ErrNotFound {
		resp.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, image)
}

func (r Router) PutRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var image models.RecipeImage
	if err := readJSONFromRequest(req, &image); err != nil {
		resp.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := r.model.Images.UpdateMainImage(&image); err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (r Router) DeleteImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	imageID, err := strconv.ParseInt(p.ByName("imageID"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	if err := r.model.Images.Delete(imageID); err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusOK)
}
