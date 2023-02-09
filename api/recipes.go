package api

import (
	"context"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
)

func (h apiHandler) Find(_ context.Context, request FindRequestObject) (FindResponseObject, error) {
	params := request.Params
	query := ""
	if params.Q != nil {
		query = *params.Q
	}
	var fields []models.SearchField
	if params.Fields != nil {
		fields = *params.Fields
	}
	var states []models.RecipeState
	if params.States != nil {
		states = *params.States
	}
	var tags []string
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
		}
	}

	filter := models.SearchFilter{
		Query:        query,
		Fields:       fields,
		Tags:         tags,
		WithPictures: withPictures,
		States:       states,
		SortBy:       params.Sort,
		SortDir:      params.Dir,
	}

	recipes, total, err := h.db.Recipes().Find(&filter, params.Page, params.Count)
	if err != nil {
		return nil, err
	}

	return Find200JSONResponse{Recipes: *recipes, Total: total}, nil
}

func (h apiHandler) GetRecipe(_ context.Context, request GetRecipeRequestObject) (GetRecipeResponseObject, error) {
	recipe, err := h.db.Recipes().Read(request.RecipeId)
	if err != nil {
		return nil, err
	}

	return GetRecipe200JSONResponse(*recipe), nil
}

func (h apiHandler) AddRecipe(_ context.Context, request AddRecipeRequestObject) (AddRecipeResponseObject, error) {
	recipe := request.Body
	if err := h.db.Recipes().Create(recipe); err != nil {
		return nil, err
	}

	return AddRecipe201JSONResponse(*recipe), nil
}

func (h apiHandler) SaveRecipe(_ context.Context, request SaveRecipeRequestObject) (SaveRecipeResponseObject, error) {
	recipe := request.Body
	if recipe.Id == nil {
		recipe.Id = &request.RecipeId
	} else if *recipe.Id != request.RecipeId {
		return nil, errMismatchedId
	}

	if err := h.db.Recipes().Update(recipe); err != nil {
		return nil, err
	}

	return SaveRecipe204Response{}, nil
}

func (h apiHandler) DeleteRecipe(_ context.Context, request DeleteRecipeRequestObject) (DeleteRecipeResponseObject, error) {
	if err := h.db.Recipes().Delete(request.RecipeId); err != nil {
		return nil, err
	}

	// Delete all the uploaded image files associated with the recipe also
	if err := upload.DeleteAll(h.upl, request.RecipeId); err != nil {
		return nil, err
	}

	return DeleteRecipe204Response{}, nil
}

func (h apiHandler) SetState(_ context.Context, request SetStateRequestObject) (SetStateResponseObject, error) {
	if err := h.db.Recipes().SetState(request.RecipeId, *request.Body); err != nil {
		return nil, err
	}

	return SetState204Response{}, nil
}

func (h apiHandler) GetRating(_ context.Context, request GetRatingRequestObject) (GetRatingResponseObject, error) {
	rating, err := h.db.Recipes().GetRating(request.RecipeId)
	if err != nil {
		return nil, err
	}

	return GetRating200JSONResponse(*rating), nil
}

func (h apiHandler) SetRating(_ context.Context, request SetRatingRequestObject) (SetRatingResponseObject, error) {
	if err := h.db.Recipes().SetRating(request.RecipeId, *request.Body); err != nil {
		return nil, err
	}

	return SetRating204Response{}, nil
}
