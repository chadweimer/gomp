package api

import (
	"context"
	"errors"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/models"
)

func (h apiHandler) Find(ctx context.Context, request FindRequestObject) (FindResponseObject, error) {
	params := request.Params
	query := ""
	if params.Q != nil {
		query = *params.Q
	}
	fields := make([]models.SearchField, 0)
	if params.Fields != nil {
		fields = *params.Fields
	}
	states := make([]models.RecipeState, 0)
	if params.States != nil {
		states = *params.States
	}
	tags := make([]string, 0)
	if params.Tags != nil {
		tags = *params.Tags
	}
	var withPictures *bool
	if params.Pictures != nil {
		switch *params.Pictures {
		case Yes:
			val := true
			withPictures = &val
		case No:
			val := false
			withPictures = &val
		default:
			// No action needed for other values
		}
	}

	sortBy := models.SortByID
	if params.Sort != nil {
		sortBy = *params.Sort
	}
	sortDir := models.Asc
	if params.Sort != nil {
		sortDir = *params.Dir
	}
	page := int64(1)
	if params.Page != nil {
		page = *params.Page
	}

	filter := models.SearchFilter{
		Query:        query,
		Fields:       fields,
		Tags:         tags,
		WithPictures: withPictures,
		States:       states,
		SortBy:       sortBy,
		SortDir:      sortDir,
	}

	recipes, total, err := h.db.Recipes().Find(ctx, &filter, page, params.Count)
	if err != nil {
		return nil, err
	}

	return Find200JSONResponse{Recipes: recipes, Total: total}, nil
}

func (h apiHandler) GetRecipe(ctx context.Context, request GetRecipeRequestObject) (GetRecipeResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	recipe, err := h.db.Recipes().Read(ctx, request.RecipeID)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return GetRecipe404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to get recipe",
			"error", err,
			"recipe-id", request.RecipeID)
		return nil, err
	}

	return GetRecipe200JSONResponse(*recipe), nil
}

func (h apiHandler) AddRecipe(ctx context.Context, request AddRecipeRequestObject) (AddRecipeResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	recipe := request.Body
	if err := h.db.Recipes().Create(ctx, recipe); err != nil {
		logger.ErrorContext(ctx, "Failed to add recipe", "error", err)
		return nil, err
	}

	return AddRecipe201JSONResponse(*recipe), nil
}

func (h apiHandler) SaveRecipe(ctx context.Context, request SaveRecipeRequestObject) (SaveRecipeResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	recipe := request.Body
	if recipe.ID == nil {
		recipe.ID = &request.RecipeID
	} else if *recipe.ID != request.RecipeID {
		logger.ErrorContext(ctx, "Request ID does not match recipe ID",
			"request-id", request.RecipeID,
			"recipe-id", *recipe.ID)
		return SaveRecipe400Response{}, nil
	}

	if err := h.db.Recipes().Update(ctx, recipe); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return SaveRecipe404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to update recipe",
			"error", err,
			"recipe-id", request.RecipeID)
		return nil, err
	}

	return SaveRecipe204Response{}, nil
}

func (h apiHandler) PatchRecipe(ctx context.Context, request PatchRecipeRequestObject) (PatchRecipeResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	patch := request.Body
	if err := h.db.Recipes().Patch(ctx, request.RecipeID, patch); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return PatchRecipe404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to patch recipe",
			"error", err,
			"recipe-id", request.RecipeID)
		return nil, err
	}

	return PatchRecipe204Response{}, nil
}

func (h apiHandler) DeleteRecipe(ctx context.Context, request DeleteRecipeRequestObject) (DeleteRecipeResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if err := h.db.Recipes().Delete(ctx, request.RecipeID); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return DeleteRecipe404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to delete recipe",
			"error", err,
			"recipe-id", request.RecipeID)
		return nil, err
	}

	// Delete all the uploaded image files associated with the recipe also
	if err := h.upl.DeleteAll(request.RecipeID); err != nil {
		return nil, err
	}

	return DeleteRecipe204Response{}, nil
}
