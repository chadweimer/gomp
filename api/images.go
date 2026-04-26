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

func (h apiHandler) UploadImage(ctx context.Context, request UploadImageRequestObject) (UploadImageResponseObject, error) {
	uploadedFileData, imageName, err := readFile(request.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}

	// Save the image itself
	res, err := h.upl.Save(request.RecipeID, imageName, uploadedFileData)
	if err != nil {
		return nil, fmt.Errorf("failed to save image file: %w", err)
	}

	// Update main image if necessary
	if err := h.setMainImageIfNecessary(ctx, request.RecipeID, nil); err != nil {
		return nil, fmt.Errorf("failed to update main image after upload: %w", err)
	}

	return UploadImage201Response{
		Headers: UploadImage201ResponseHeaders{
			Location: res.URL,
		},
	}, nil
}

func (h apiHandler) DeleteImage(ctx context.Context, request DeleteImageRequestObject) (DeleteImageResponseObject, error) {
	if err := h.upl.Delete(request.RecipeID, request.Name); err != nil {
		return nil, fmt.Errorf("failed to delete image file: %w", err)
	}

	// Update main image if necessary
	if err := h.setMainImageIfNecessary(ctx, request.RecipeID, &request.Name); err != nil {
		return nil, fmt.Errorf("failed to update main image after deletion: %w", err)
	}

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
		// Delete the original image
		if err := h.upl.Delete(request.RecipeID, request.Name); err != nil {
			return nil, fmt.Errorf("failed to delete original image file: %w", err)
		}
	}

	return OptimizeImage200Response{
		Headers: OptimizeImage200ResponseHeaders{
			Location: res.URL,
		},
	}, nil
}

func (h apiHandler) setMainImageIfNecessary(ctx context.Context, recipeID int64, justDeletedImageName *string) error {
	images, err := h.upl.List(recipeID)
	if err != nil {
		return fmt.Errorf("failed to list images for recipe %d: %w", recipeID, err)
	}
	recipe, err := h.db.Recipes().Read(ctx, recipeID)
	if err != nil {
		return fmt.Errorf("failed to get recipe %d: %w", recipeID, err)
	}

	saveNeeded := false
	if len(images) == 0 && recipe.MainImageName != nil {
		recipe.MainImageName = nil
		saveNeeded = true
	} else if len(images) > 0 && (recipe.MainImageName == nil || (justDeletedImageName != nil && *recipe.MainImageName == *justDeletedImageName)) {
		recipe.MainImageName = &images[0]
		saveNeeded = true
	}

	if saveNeeded {
		if err := h.db.Recipes().Update(ctx, recipe); err != nil {
			return fmt.Errorf("failed to update recipe %d with main image: %w", recipeID, err)
		}
	}

	return nil
}
