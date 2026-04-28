package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
)

func (h apiHandler) GetSearchFilters(ctx context.Context, _ GetSearchFiltersRequestObject) (GetSearchFiltersResponseObject, error) {
	return withCurrentUser[GetSearchFiltersResponseObject](ctx, GetSearchFilters401Response{}, func(userID int64) (GetSearchFiltersResponseObject, error) {
		searches, err := h.db.UserSearchFilters().List(ctx, userID)
		if err != nil {
			return nil, err
		}

		return GetSearchFilters200JSONResponse(*searches), nil
	})
}

func (h apiHandler) GetUserSearchFilters(ctx context.Context, request GetUserSearchFiltersRequestObject) (GetUserSearchFiltersResponseObject, error) {
	searches, err := h.db.UserSearchFilters().List(ctx, request.UserID)
	if err != nil {
		return nil, err
	}

	return GetUserSearchFilters200JSONResponse(*searches), nil
}

func (h apiHandler) AddSearchFilter(ctx context.Context, request AddSearchFilterRequestObject) (AddSearchFilterResponseObject, error) {
	return withCurrentUser[AddSearchFilterResponseObject](ctx, AddSearchFilter401Response{}, func(userID int64) (AddSearchFilterResponseObject, error) {
		filter, err := h.addUserSearchFilterImpl(ctx, userID, request.Body)
		if err != nil {
			return nil, err
		}

		return AddSearchFilter201JSONResponse(*filter), nil
	})
}

func (h apiHandler) AddUserSearchFilter(ctx context.Context, request AddUserSearchFilterRequestObject) (AddUserSearchFilterResponseObject, error) {
	filter, err := h.addUserSearchFilterImpl(ctx, request.UserID, request.Body)
	if err != nil {
		return nil, err
	}

	return AddUserSearchFilter201JSONResponse(*filter), nil
}

func (h apiHandler) addUserSearchFilterImpl(ctx context.Context, userID int64, filter *models.SavedSearchFilter) (*models.SavedSearchFilter, error) {
	// Make sure the ID is set in the object
	if filter.UserID == nil {
		filter.UserID = &userID
	} else if *filter.UserID != userID {
		return nil, errMismatchedID
	}

	if err := h.db.UserSearchFilters().Create(ctx, filter); err != nil {
		return nil, err
	}

	return filter, nil
}

func (h apiHandler) GetSearchFilter(ctx context.Context, request GetSearchFilterRequestObject) (GetSearchFilterResponseObject, error) {
	return withCurrentUser[GetSearchFilterResponseObject](ctx, GetSearchFilter401Response{}, func(userID int64) (GetSearchFilterResponseObject, error) {
		filter, err := h.db.UserSearchFilters().Read(ctx, userID, request.FilterID)
		if err != nil {
			return nil, fmt.Errorf("reading filter: %w", err)
		}

		return GetSearchFilter200JSONResponse(*filter), nil
	})
}

func (h apiHandler) GetUserSearchFilter(ctx context.Context, request GetUserSearchFilterRequestObject) (GetUserSearchFilterResponseObject, error) {
	filter, err := h.db.UserSearchFilters().Read(ctx, request.UserID, request.FilterID)
	if err != nil {
		return nil, fmt.Errorf("reading filter: %w", err)
	}

	return GetUserSearchFilter200JSONResponse(*filter), nil
}

func (h apiHandler) SaveSearchFilter(ctx context.Context, request SaveSearchFilterRequestObject) (SaveSearchFilterResponseObject, error) {
	return withCurrentUser[SaveSearchFilterResponseObject](ctx, SaveSearchFilter401Response{}, func(userID int64) (SaveSearchFilterResponseObject, error) {
		if err := h.saveUserSearchFilterImpl(ctx, userID, request.FilterID, request.Body); err != nil {
			return nil, err
		}

		return SaveSearchFilter204Response{}, nil
	})
}

func (h apiHandler) SaveUserSearchFilter(ctx context.Context, request SaveUserSearchFilterRequestObject) (SaveUserSearchFilterResponseObject, error) {
	if err := h.saveUserSearchFilterImpl(ctx, request.UserID, request.FilterID, request.Body); err != nil {
		return nil, err
	}

	return SaveUserSearchFilter204Response{}, nil
}

func (h apiHandler) saveUserSearchFilterImpl(ctx context.Context, userID int64, filterID int64, filter *models.SavedSearchFilter) error {
	// Make sure the ID is set in the object
	if filter.ID == nil {
		filter.ID = &filterID
	} else if *filter.ID != filterID {
		return errMismatchedID
	}

	// Make sure the UserID is set in the object
	if filter.UserID == nil {
		filter.UserID = &userID
	} else if *filter.UserID != userID {
		return errMismatchedID
	}

	// Check that the filter exists for the specified user
	if _, err := h.db.UserSearchFilters().Read(ctx, userID, filterID); err != nil {
		return err
	}

	return h.db.UserSearchFilters().Update(ctx, filter)
}

func (h apiHandler) DeleteSearchFilter(ctx context.Context, request DeleteSearchFilterRequestObject) (DeleteSearchFilterResponseObject, error) {
	return withCurrentUser[DeleteSearchFilterResponseObject](ctx, DeleteSearchFilter401Response{}, func(userID int64) (DeleteSearchFilterResponseObject, error) {
		if err := h.db.UserSearchFilters().Delete(ctx, userID, request.FilterID); err != nil {
			return nil, err
		}

		return DeleteSearchFilter204Response{}, nil
	})
}

func (h apiHandler) DeleteUserSearchFilter(ctx context.Context, request DeleteUserSearchFilterRequestObject) (DeleteUserSearchFilterResponseObject, error) {
	if err := h.db.UserSearchFilters().Delete(ctx, request.UserID, request.FilterID); err != nil {
		return nil, err
	}

	return DeleteUserSearchFilter204Response{}, nil
}
