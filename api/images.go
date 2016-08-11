package api

import (
	"errors"
	"fmt"
	"io/ioutil"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
	"github.com/mholt/binding"
)

type postImageRequest struct {
	FileName    string                `form:"file_name"`
	FileContent *multipart.FileHeader `form:"file_content"`
}

func (r *postImageRequest) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&r.FileName:    "file_name",
		&r.FileContent: "file_content",
	}
}

func (r Router) getRecipeImages(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	images, err := r.model.Images.List(recipeID)
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, images)
}

func (r Router) getRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	image, err := r.model.Images.ReadMainImage(recipeID)
	if err == models.ErrNotFound {
		writeErrorToResponse(resp, http.StatusNotFound, err)
		return
	}
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, image)
}

func (r Router) putRecipeMainImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	var imageID int64
	if err := readJSONFromRequest(req, &imageID); err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	image := models.RecipeImage{ID: imageID, RecipeID: recipeID}
	if err := r.model.Images.UpdateMainImage(&image); err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}
func (r Router) postImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	form := new(postImageRequest)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		writeClientErrorToResponse(resp, errors.New(errs.Error()))
		return
	}

	uploadedFile, err := form.FileContent.Open()
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}
	defer uploadedFile.Close()

	uploadedFileData, err := ioutil.ReadAll(uploadedFile)
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	imageInfo := &models.RecipeImage{
		RecipeID: recipeID,
		Name:     form.FileName,
	}
	err = r.model.Images.Create(imageInfo, uploadedFileData)
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("%s/api/v1/recipes/%d/images/%d", r.cfg.RootURLPath, imageInfo.RecipeID, imageInfo.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (r Router) deleteImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	imageID, err := strconv.ParseInt(p.ByName("imageID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	if err := r.model.Images.Delete(imageID); err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusOK)
}
