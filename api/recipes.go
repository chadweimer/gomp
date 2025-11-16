package api

import (
	"context"

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
	recipe, err := h.db.Recipes().Read(ctx, request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetRecipe200JSONResponse(*recipe), nil
}

func (h apiHandler) AddRecipe(ctx context.Context, request AddRecipeRequestObject) (AddRecipeResponseObject, error) {
	recipe := request.Body
	if err := h.db.Recipes().Create(ctx, recipe); err != nil {
		return nil, err
	}

	return AddRecipe201JSONResponse(*recipe), nil
}

func (h apiHandler) SaveRecipe(ctx context.Context, request SaveRecipeRequestObject) (SaveRecipeResponseObject, error) {
	recipe := request.Body
	if recipe.ID == nil {
		recipe.ID = &request.RecipeID
	} else if *recipe.ID != request.RecipeID {
		return nil, errMismatchedID
	}

	if err := h.db.Recipes().Update(ctx, recipe); err != nil {
		return nil, err
	}

	return SaveRecipe204Response{}, nil
}

func (h apiHandler) DeleteRecipe(ctx context.Context, request DeleteRecipeRequestObject) (DeleteRecipeResponseObject, error) {
	if err := h.db.Recipes().Delete(ctx, request.RecipeID); err != nil {
		return nil, err
	}

	// Delete all the uploaded image files associated with the recipe also
	if err := h.upl.DeleteAll(request.RecipeID); err != nil {
		return nil, err
	}

	return DeleteRecipe204Response{}, nil
}

func (h apiHandler) SetState(ctx context.Context, request SetStateRequestObject) (SetStateResponseObject, error) {
	if err := h.db.Recipes().SetState(ctx, request.RecipeID, *request.Body); err != nil {
		return nil, err
	}

	return SetState204Response{}, nil
}

func (h apiHandler) GetRating(ctx context.Context, request GetRatingRequestObject) (GetRatingResponseObject, error) {
	rating, err := h.db.Recipes().GetRating(ctx, request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetRating200JSONResponse(*rating), nil
}

func (h apiHandler) SetRating(ctx context.Context, request SetRatingRequestObject) (SetRatingResponseObject, error) {
	if err := h.db.Recipes().SetRating(ctx, request.RecipeID, *request.Body); err != nil {
		return nil, err
	}

	return SetRating204Response{}, nil
}

func (h apiHandler) GetAllTags(ctx context.Context, _ GetAllTagsRequestObject) (GetAllTagsResponseObject, error) {
	tags, err := h.db.Recipes().ListAllTags(ctx)
	if err != nil {
		return nil, err
	}

	return GetAllTags200JSONResponse(*tags), nil
}
