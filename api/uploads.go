package api

import (
	"context"
	"io"
	"mime/multipart"
	"path/filepath"

	"github.com/google/uuid"
)

func (h apiHandler) Upload(_ context.Context, request UploadRequestObject) (UploadResponseObject, error) {
	uploadedFileData, imageName, err := readFile(request.Body)
	if err != nil {
		return nil, err
	}

	fileURL := filepath.ToSlash(filepath.Join("/uploads/", imageName))
	if err := h.upl.Driver.Save(imageName, uploadedFileData); err != nil {
		return nil, err
	}

	return Upload201Response{
		Headers: Upload201ResponseHeaders{
			Location: fileURL,
		},
	}, nil
}

func readFile(reader *multipart.Reader) ([]byte, string, error) {
	part, err := reader.NextPart()
	if err != nil {
		return nil, "", err
	}
	defer part.Close()

	fileName := part.FileName()
	uploadedFileData, err := io.ReadAll(part)
	if err != nil {
		return nil, "", err
	}

	// Generate a unique name for the image
	imageExt := filepath.Ext(fileName)
	imageName := uuid.New().String() + imageExt
	return uploadedFileData, imageName, nil
}
