package api

import (
	"io/ioutil"
	"net/http"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) postUpload(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
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
	imageName := uuid.New().String() + imageExt

	fileURL := filepath.ToSlash(filepath.Join("/uploads/", imageName))
	h.upl.Save(imageName, uploadedFileData)

	resp.Header().Set("Location", fileURL)
	resp.WriteHeader(http.StatusCreated)
}
