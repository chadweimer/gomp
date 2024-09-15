package api

import (
	"context"
)

func (h apiHandler) GetLinks(_ context.Context, request GetLinksRequestObject) (GetLinksResponseObject, error) {
	recipes, err := h.db.Links().List(request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetLinks200JSONResponse(*recipes), nil
}

func (h apiHandler) AddLink(_ context.Context, request AddLinkRequestObject) (AddLinkResponseObject, error) {
	if err := h.db.Links().Create(request.RecipeID, request.DestRecipeID); err != nil {
		return nil, err
	}

	return AddLink204Response{}, nil
}

func (h apiHandler) DeleteLink(_ context.Context, request DeleteLinkRequestObject) (DeleteLinkResponseObject, error) {
	if err := h.db.Links().Delete(request.RecipeID, request.DestRecipeID); err != nil {
		return nil, err
	}

	return DeleteLink204Response{}, nil
}
