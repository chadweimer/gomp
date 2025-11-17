package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
)

func (h apiHandler) GetImages(ctx context.Context, request GetImagesRequestObject) (GetImagesResponseObject, error) {
	images, err := h.db.Images().List(ctx, request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetImages200JSONResponse(*images), nil
}

func (h apiHandler) GetMainImage(ctx context.Context, request GetMainImageRequestObject) (GetMainImageResponseObject, error) {
	image, err := h.db.Images().ReadMainImage(ctx, request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetMainImage200JSONResponse(*image), nil
}

func (h apiHandler) SetMainImage(ctx context.Context, request SetMainImageRequestObject) (SetMainImageResponseObject, error) {
	image := models.RecipeImage{ID: request.Body, RecipeID: &request.RecipeID}
	if err := h.db.Images().UpdateMainImage(ctx, *image.RecipeID, *image.ID); err != nil {
		return nil, err
	}

	return SetMainImage204Response{}, nil
}
func (h apiHandler) UploadImage(ctx context.Context, request UploadImageRequestObject) (UploadImageResponseObject, error) {
	uploadedFileData, imageName, err := readFile(request.Body)
	if err != nil {
		return nil, err
	}

	// Save the image itself
	saveResult, err := h.upl.Save(request.RecipeID, imageName, uploadedFileData)
	if err != nil {
		return nil, fmt.Errorf("failed to save image file: %w", err)
	}

	imageInfo := models.RecipeImage{
		RecipeID:     &request.RecipeID,
		Name:         &saveResult.Name,
		URL:          &saveResult.URL,
		ThumbnailURL: &saveResult.ThumbnailURL,
	}

	// Now insert the record in the database
	if err = h.db.Images().Create(ctx, &imageInfo); err != nil {
		return nil, fmt.Errorf("failed to insert image database record: %w", err)
	}

	return UploadImage201JSONResponse(imageInfo), nil
}

func (h apiHandler) DeleteImage(ctx context.Context, request DeleteImageRequestObject) (DeleteImageResponseObject, error) {
	// We need to read the info about the image for later
	image, err := h.db.Images().Read(ctx, request.RecipeID, request.ImageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get image database record: %w", err)
	}

	// Now delete the record from the database
	if err := h.db.Images().Delete(ctx, request.RecipeID, request.ImageID); err != nil {
		return nil, fmt.Errorf("failed to delete image database record: %w", err)
	}

	// And lastly delete the image file itself
	if err := h.upl.Delete(request.RecipeID, *image.Name); err != nil {
		return nil, fmt.Errorf("failed to delete image file: %w", err)
	}

	return DeleteImage204Response{}, nil
}

func (h apiHandler) OptimizeImage(ctx context.Context, request OptimizeImageRequestObject) (OptimizeImageResponseObject, error) {
	// We need to read the info about the image for later
	image, err := h.db.Images().Read(ctx, request.RecipeID, request.ImageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get image database record: %w", err)
	}

	// Load the current original
	data, err := h.upl.Load(request.RecipeID, *image.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to read existing image data: %w", err)
	}

	// Resave it, which will downscale if larger than the threshold,
	// as well as regenerate the thumbnail
	if _, err = h.upl.Save(request.RecipeID, *image.Name, data); err != nil {
		return nil, fmt.Errorf("failed to re-save image data: %w", err)
	}

	return OptimizeImage204Response{}, nil
}
