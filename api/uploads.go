package api

import (
	"io/ioutil"
	"net/http"
	"path/filepath"

	"github.com/google/uuid"
)

func (h apiHandler) Upload(w http.ResponseWriter, r *http.Request) {
	file, fileHeader, err := r.FormFile("file_content")
	if err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}
	defer file.Close()

	uploadedFileData, err := ioutil.ReadAll(file)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	// Generate a unique name for the image
	imageExt := filepath.Ext(fileHeader.Filename)
	imageName := uuid.New().String() + imageExt

	fileUrl := filepath.ToSlash(filepath.Join("/uploads/", imageName))
	h.upl.Save(imageName, uploadedFileData)

	h.CreatedWithLocation(w, fileUrl)
}
