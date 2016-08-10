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

type PostImageRequest struct {
	FileName    string                `form:"file_name"`
	FileContent *multipart.FileHeader `form:"file_content"`
}

func (r *PostImageRequest) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&r.FileName:    "file_name",
		&r.FileContent: "file_content",
	}
}

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
func (r Router) PostImage(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(PostImageRequest)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		writeErrorToResponse(resp, errors.New(errs.Error()))
		return
	}

	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	uploadedFile, err := form.FileContent.Open()
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}
	defer uploadedFile.Close()

	uploadedFileData, err := ioutil.ReadAll(uploadedFile)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	imageInfo := &models.RecipeImage{
		RecipeID: recipeID,
		Name:     form.FileName,
	}
	err = r.model.Images.Create(imageInfo, uploadedFileData)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("%s/api/v1/recipes/%d/images/%d", r.cfg.RootURLPath, imageInfo.RecipeID, imageInfo.ID))
	resp.WriteHeader(http.StatusCreated)
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
