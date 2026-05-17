package api

import (
	"context"
	"errors"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
)

func (h apiHandler) GetLinks(ctx context.Context, request GetLinksRequestObject) (GetLinksResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	recipes, err := h.db.Links().List(ctx, request.RecipeID)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return GetLinks404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to get links for recipe",
			"error", err,
			"recipe-id", request.RecipeID)
	}

	return GetLinks200JSONResponse(*recipes), nil
}

func (h apiHandler) AddLink(ctx context.Context, request AddLinkRequestObject) (AddLinkResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if err := h.db.Links().Create(ctx, request.RecipeID, request.DestRecipeID); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return AddLink404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to add link",
			"error", err,
			"recipe-id", request.RecipeID,
			"dest-recipe-id", request.DestRecipeID)
		return nil, err
	}

	return AddLink204Response{}, nil
}

func (h apiHandler) DeleteLink(ctx context.Context, request DeleteLinkRequestObject) (DeleteLinkResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if err := h.db.Links().Delete(ctx, request.RecipeID, request.DestRecipeID); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return DeleteLink404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to delete link",
			"error", err,
			"recipe-id", request.RecipeID,
			"dest-recipe-id", request.DestRecipeID)
		return nil, err
	}

	return DeleteLink204Response{}, nil
}
