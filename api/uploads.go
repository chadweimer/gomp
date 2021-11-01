package api

import (
	"io/ioutil"
	"net/http"
	"path/filepath"

	"github.com/google/uuid"
)

func (h *apiHandler) postUpload(resp http.ResponseWriter, req *http.Request) {
	file, fileHeader, err := req.FormFile("file_content")
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}
	defer file.Close()

	uploadedFileData, err := ioutil.ReadAll(file)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	// Generate a unique name for the image
	imageExt := filepath.Ext(fileHeader.Filename)
	imageName := uuid.New().String() + imageExt

	fileUrl := filepath.ToSlash(filepath.Join("/uploads/", imageName))
	h.upl.Save(imageName, uploadedFileData)

	h.CreatedWithLocation(resp, fileUrl)
}
