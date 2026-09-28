package api

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
)

func (h apiHandler) GetImages(ctx context.Context, request GetImagesRequestObject) (GetImagesResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	images, err := h.upl.List(request.RecipeID)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to get images for recipe",
			"error", err,
			"recipe-id", request.RecipeID)
		return nil, err
	}

	return GetImages200JSONResponse(images), nil
}

func (h apiHandler) UploadImage(ctx context.Context, request UploadImageRequestObject) (UploadImageResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	uploadedFileData, imageName, err := readFile(request.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}

	// Save the image itself
	res, err := h.upl.Save(request.RecipeID, imageName, uploadedFileData)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) || errors.Is(err, fs.ErrNotExist) {
			return UploadImage404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to save image for recipe",
			"error", err,
			"recipe-id", request.RecipeID)
		return nil, err
	}

	// Update main image if necessary
	if err := h.setMainImageIfNecessary(ctx, request.RecipeID); err != nil {
		return nil, fmt.Errorf("failed to update main image after upload: %w", err)
	}

	return UploadImage201Response{
		Headers: UploadImage201ResponseHeaders{
			Location: &res.URL,
		},
	}, nil
}

func (h apiHandler) DeleteImage(ctx context.Context, request DeleteImageRequestObject) (DeleteImageResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	// Validate the image name to prevent path traversal attacks
	if !isNameSafe(request.Name) {
		logger.WarnContext(ctx, "invalid image name", "name", request.Name)
		return DeleteImage400Response{}, nil
	}

	if err := h.upl.Delete(request.RecipeID, request.Name); err != nil {
		if errors.Is(err, db.ErrNotFound) || errors.Is(err, fs.ErrNotExist) {
			return DeleteImage404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to delete image for recipe",
			"error", err,
			"recipe-id", request.RecipeID,
			"image-name", request.Name)
		return nil, err
	}

	// Update recipe if necessary (main image and/or directions)
	if err := h.updateRecipeAfterImageDeletion(ctx, request.RecipeID, request.Name); err != nil {
		return nil, fmt.Errorf("failed to update recipe after image deletion: %w", err)
	}

	return DeleteImage204Response{}, nil
}

func (h apiHandler) setMainImageIfNecessary(ctx context.Context, recipeID int64) error {
	images, err := h.upl.List(recipeID)
	if err != nil {
		return fmt.Errorf("failed to list images for recipe %d: %w", recipeID, err)
	}
	recipe, err := h.db.Recipes().Read(ctx, recipeID)
	if err != nil {
		return fmt.Errorf("failed to get recipe %d: %w", recipeID, err)
	}

	if len(images) > 0 && recipe.MainImageName == "" {
		recipe.MainImageName = images[0]
		if err := h.db.Recipes().Update(ctx, recipe); err != nil {
			return fmt.Errorf("failed to update recipe %d with main image: %w", recipeID, err)
		}
	}

	return nil
}

func (h apiHandler) updateRecipeAfterImageDeletion(ctx context.Context, recipeID int64, deletedImageName string) error {
	images, err := h.upl.List(recipeID)
	if err != nil {
		return fmt.Errorf("failed to list images for recipe %d: %w", recipeID, err)
	}
	recipe, err := h.db.Recipes().Read(ctx, recipeID)
	if err != nil {
		return fmt.Errorf("failed to get recipe %d: %w", recipeID, err)
	}

	saveNeeded := false
	if len(images) == 0 && recipe.MainImageName != "" {
		recipe.MainImageName = ""
		saveNeeded = true
	} else if len(images) > 0 && recipe.MainImageName == deletedImageName {
		recipe.MainImageName = images[0]
		saveNeeded = true
	}

	newDirections := removeImageFromDirections(recipe.Directions, deletedImageName)
	if newDirections != recipe.Directions {
		recipe.Directions = newDirections
		saveNeeded = true
	}

	if saveNeeded {
		if err := h.db.Recipes().Update(ctx, recipe); err != nil {
			return fmt.Errorf("failed to update recipe %d after image deletion: %w", recipeID, err)
		}
	}

	return nil
}

func removeImageFromDirections(directions string, imageName string) string {
	return strings.ReplaceAll(directions, fmt.Sprintf("{{image:%s}}", imageName), "")
}

func isNameSafe(name string) bool {
	return filepath.Base(name) == name &&
		filepath.Clean(name) == name &&
		!filepath.IsAbs(name) &&
		name != "." &&
		name != ".."
}
