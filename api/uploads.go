package api

import (
	"context"
	"io"
	"io/ioutil"
	"path/filepath"

	"github.com/google/uuid"
)

func (h apiHandler) Upload(_ context.Context, request UploadRequestObject) (UploadResponseObject, error) {
	part, err := request.Body.NextPart()
	if err == io.EOF {
		return Upload400Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	fileName := part.FileName()
	uploadedFileData, err := ioutil.ReadAll(part)
	if err != nil {
		return nil, err
	}
	// Generate a unique name for the image
	imageExt := filepath.Ext(fileName)
	imageName := uuid.New().String() + imageExt

	fileUrl := filepath.ToSlash(filepath.Join("/uploads/", imageName))
	if err := h.upl.Save(imageName, uploadedFileData); err != nil {
		return nil, err
	}

	return Upload201Response{
		Headers: Upload201ResponseHeaders{
			Location: fileUrl,
		},
	}, nil
}
