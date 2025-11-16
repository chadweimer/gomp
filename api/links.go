package api

import (
	"context"
)

func (h apiHandler) GetLinks(ctx context.Context, request GetLinksRequestObject) (GetLinksResponseObject, error) {
	recipes, err := h.db.Links().List(ctx, request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetLinks200JSONResponse(*recipes), nil
}

func (h apiHandler) AddLink(ctx context.Context, request AddLinkRequestObject) (AddLinkResponseObject, error) {
	if err := h.db.Links().Create(ctx, request.RecipeID, request.DestRecipeID); err != nil {
		return nil, err
	}

	return AddLink204Response{}, nil
}

func (h apiHandler) DeleteLink(ctx context.Context, request DeleteLinkRequestObject) (DeleteLinkResponseObject, error) {
	if err := h.db.Links().Delete(ctx, request.RecipeID, request.DestRecipeID); err != nil {
		return nil, err
	}

	return DeleteLink204Response{}, nil
}
