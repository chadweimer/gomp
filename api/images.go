package api

import (
	"context"
	"fmt"
)

func (h apiHandler) GetImages(_ context.Context, request GetImagesRequestObject) (GetImagesResponseObject, error) {
	images, err := h.upl.List(request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetImages200JSONResponse(images), nil
}

func (h apiHandler) UploadImage(_ context.Context, request UploadImageRequestObject) (UploadImageResponseObject, error) {
	uploadedFileData, imageName, err := readFile(request.Body)
	if err != nil {
		return nil, err
	}

	// Save the image itself
	res, err := h.upl.Save(request.RecipeID, imageName, uploadedFileData)
	if err != nil {
		return nil, fmt.Errorf("failed to save image file: %w", err)
	}

	// TODO: Update main image if necessary

	return UploadImage201Response{
		Headers: UploadImage201ResponseHeaders{
			Location: res.URL,
		},
	}, nil
}

func (h apiHandler) DeleteImage(_ context.Context, request DeleteImageRequestObject) (DeleteImageResponseObject, error) {
	// And lastly delete the image file itself
	if err := h.upl.Delete(request.RecipeID, request.Name); err != nil {
		return nil, fmt.Errorf("failed to delete image file: %w", err)
	}

	// TODO: Update main image if necessary

	return DeleteImage204Response{}, nil
}

func (h apiHandler) OptimizeImage(_ context.Context, request OptimizeImageRequestObject) (OptimizeImageResponseObject, error) {
	// Load the current original
	data, err := h.upl.Load(request.RecipeID, request.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to read existing image data: %w", err)
	}

	// Resave it, which will downscale if larger than the threshold,
	// as well as regenerate the thumbnail
	res, err := h.upl.Save(request.RecipeID, request.Name, data)
	if err != nil {
		return nil, fmt.Errorf("failed to re-save image data: %w", err)
	}

	// The name may have changed if the original was not in the current optimized format
	if request.Name != res.Name {
		originalName := request.Name

		// Delete the original image
		if err := h.upl.Delete(request.RecipeID, originalName); err != nil {
			return nil, fmt.Errorf("failed to delete original image file: %w", err)
		}
	}

	return OptimizeImage200Response{
		Headers: OptimizeImage200ResponseHeaders{
			Location: res.URL,
		},
	}, nil
}
