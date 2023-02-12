package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
)

func (h apiHandler) GetImages(_ context.Context, request GetImagesRequestObject) (GetImagesResponseObject, error) {
	images, err := h.db.Images().List(request.RecipeId)
	if err != nil {
		return nil, err
	}

	return GetImages200JSONResponse(*images), nil
}

func (h apiHandler) GetMainImage(_ context.Context, request GetMainImageRequestObject) (GetMainImageResponseObject, error) {
	image, err := h.db.Images().ReadMainImage(request.RecipeId)
	if err != nil {
		return nil, err
	}

	return GetMainImage200JSONResponse(*image), nil
}

func (h apiHandler) SetMainImage(_ context.Context, request SetMainImageRequestObject) (SetMainImageResponseObject, error) {
	image := models.RecipeImage{Id: request.Body, RecipeId: &request.RecipeId}
	if err := h.db.Images().UpdateMainImage(&image); err != nil {
		return nil, err
	}

	return SetMainImage204Response{}, nil
}
func (h apiHandler) UploadImage(_ context.Context, request UploadImageRequestObject) (UploadImageResponseObject, error) {
	uploadedFileData, imageName, err := readFile(request.Body)
	if err != nil {
		return nil, err
	}

	// Save the image itself
	url, thumbUrl, err := upload.Save(h.upl, request.RecipeId, imageName, uploadedFileData)
	if err != nil {
		return nil, fmt.Errorf("failed to save image file: %w", err)
	}

	imageInfo := models.RecipeImage{
		RecipeId:     &request.RecipeId,
		Name:         &imageName,
		Url:          &url,
		ThumbnailUrl: &thumbUrl,
	}

	// Now insert the record in the database
	if err = h.db.Images().Create(&imageInfo); err != nil {
		return nil, fmt.Errorf("failed to insert image database record: %w", err)
	}

	return UploadImage201JSONResponse(imageInfo), nil
}

func (h apiHandler) DeleteImage(_ context.Context, request DeleteImageRequestObject) (DeleteImageResponseObject, error) {
	// We need to read the info about the image for later
	image, err := h.db.Images().Read(request.RecipeId, request.ImageId)
	if err != nil {
		return nil, fmt.Errorf("failed to get image database record: %w", err)
	}

	// Now delete the record from the database
	if err := h.db.Images().Delete(request.RecipeId, request.ImageId); err != nil {
		return nil, fmt.Errorf("failed to delete image database record: %w", err)
	}

	// And lastly delete the image file itself
	if err := upload.Delete(h.upl, request.RecipeId, *image.Name); err != nil {
		return nil, fmt.Errorf("failed to delete image file: %w", err)
	}

	return DeleteImage204Response{}, nil
}
