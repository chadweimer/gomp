package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
)

func (h apiHandler) GetCurrentUser(ctx context.Context, _ GetCurrentUserRequestObject) (GetCurrentUserResponseObject, error) {
	return withCurrentUser[GetCurrentUserResponseObject](ctx, GetCurrentUser401Response{}, func(userID int64) (GetCurrentUserResponseObject, error) {
		user, err := h.db.Users().Read(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("reading user: %w", err)
		}

		return GetCurrentUser200JSONResponse(user.User), nil
	})
}

func (h apiHandler) GetUser(ctx context.Context, request GetUserRequestObject) (GetUserResponseObject, error) {
	user, err := h.db.Users().Read(ctx, request.UserID)
	if err != nil {
		return nil, fmt.Errorf("reading user: %w", err)
	}

	return GetUser200JSONResponse(user.User), nil
}

func (h apiHandler) GetAllUsers(ctx context.Context, _ GetAllUsersRequestObject) (GetAllUsersResponseObject, error) {
	// Add pagination?
	users, err := h.db.Users().List(ctx)
	if err != nil {
		return nil, err
	}

	return GetAllUsers200JSONResponse(*users), nil
}

func (h apiHandler) AddUser(ctx context.Context, request AddUserRequestObject) (AddUserResponseObject, error) {
	newUser := request.Body

	if err := h.db.Users().Create(ctx, &newUser.User, newUser.Password); err != nil {
		return nil, err
	}

	return AddUser201JSONResponse(newUser.User), nil
}

func (h apiHandler) SaveUser(ctx context.Context, request SaveUserRequestObject) (SaveUserResponseObject, error) {
	return withCurrentUser[SaveUserResponseObject](ctx, SaveUser401Response{}, func(currentUserID int64) (SaveUserResponseObject, error) {
		user := request.Body
		if user.ID == nil {
			user.ID = &request.UserID
		} else if *user.ID != request.UserID {
			return nil, errMismatchedID
		}

		// Don't allow admins to make themselves non-admins
		if request.UserID == currentUserID && user.AccessLevel != models.Admin {
			return SaveUser403Response{}, nil
		}

		if err := h.db.Users().Update(ctx, request.Body); err != nil {
			return nil, err
		}

		return SaveUser204Response{}, nil
	})
}

func (h apiHandler) DeleteUser(ctx context.Context, request DeleteUserRequestObject) (DeleteUserResponseObject, error) {
	return withCurrentUser[DeleteUserResponseObject](ctx, DeleteUser401Response{}, func(userID int64) (DeleteUserResponseObject, error) {
		// Don't allow deleting self
		if request.UserID == userID {
			return DeleteUser403Response{}, nil
		}

		if err := h.db.Users().Delete(ctx, request.UserID); err != nil {
			return nil, err
		}

		return DeleteUser204Response{}, nil
	})
}

func (h apiHandler) ChangePassword(ctx context.Context, request ChangePasswordRequestObject) (ChangePasswordResponseObject, error) {
	return withCurrentUser[ChangePasswordResponseObject](ctx, ChangePassword401Response{}, func(userID int64) (ChangePasswordResponseObject, error) {
		if err := h.db.Users().UpdatePassword(ctx, userID, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
			logger(ctx).Error("update failed", "error", err)
			return ChangePassword403Response{}, nil
		}

		return ChangePassword204Response{}, nil
	})
}

func (h apiHandler) ChangeUserPassword(ctx context.Context, request ChangeUserPasswordRequestObject) (ChangeUserPasswordResponseObject, error) {
	if err := h.db.Users().UpdatePassword(ctx, request.UserID, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
		logger(ctx).Error("update failed", "error", err)
		return ChangeUserPassword403Response{}, nil
	}

	return ChangeUserPassword204Response{}, nil
}

func (h apiHandler) GetSettings(ctx context.Context, _ GetSettingsRequestObject) (GetSettingsResponseObject, error) {
	return withCurrentUser[GetSettingsResponseObject](ctx, GetSettings401Response{}, func(userID int64) (GetSettingsResponseObject, error) {
		userSettings, err := h.getUserSettingsImpl(ctx, userID)
		if err != nil {
			return nil, err
		}

		return GetSettings200JSONResponse(*userSettings), nil
	})
}

func (h apiHandler) GetUserSettings(ctx context.Context, request GetUserSettingsRequestObject) (GetUserSettingsResponseObject, error) {
	userSettings, err := h.getUserSettingsImpl(ctx, request.UserID)
	if err != nil {
		return nil, err
	}

	return GetUserSettings200JSONResponse(*userSettings), nil
}

func (h apiHandler) getUserSettingsImpl(ctx context.Context, userID int64) (*models.UserSettings, error) {
	userSettings, err := h.db.Users().ReadSettings(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("reading user settings: %w", err)
	}

	// Default to the application title if the user hasn't set their own
	if userSettings.HomeTitle == nil {
		if cfg, err := h.db.AppConfiguration().Read(ctx); err == nil {
			userSettings.HomeTitle = &cfg.Title
		}
	}

	return userSettings, nil
}

func (h apiHandler) SaveSettings(ctx context.Context, request SaveSettingsRequestObject) (SaveSettingsResponseObject, error) {
	return withCurrentUser[SaveSettingsResponseObject](ctx, SaveSettings401Response{}, func(userID int64) (SaveSettingsResponseObject, error) {
		if err := h.saveUserSettingsImpl(ctx, userID, request.Body); err != nil {
			return nil, err
		}

		return SaveSettings204Response{}, nil
	})
}

func (h apiHandler) SaveUserSettings(ctx context.Context, request SaveUserSettingsRequestObject) (SaveUserSettingsResponseObject, error) {
	if err := h.saveUserSettingsImpl(ctx, request.UserID, request.Body); err != nil {
		return nil, err
	}

	return SaveUserSettings204Response{}, nil
}

func (h apiHandler) saveUserSettingsImpl(ctx context.Context, userID int64, userSettings *models.UserSettings) error {
	// Make sure the ID is set in the object
	if userSettings.UserID == nil {
		userSettings.UserID = &userID
	} else if *userSettings.UserID != userID {
		return errMismatchedID
	}

	if err := h.db.Users().UpdateSettings(ctx, userSettings); err != nil {
		return fmt.Errorf("updating user settings: %w", err)
	}

	return nil
}

func (h apiHandler) GetSearchFilters(ctx context.Context, _ GetSearchFiltersRequestObject) (GetSearchFiltersResponseObject, error) {
	return withCurrentUser[GetSearchFiltersResponseObject](ctx, GetSearchFilters401Response{}, func(userID int64) (GetSearchFiltersResponseObject, error) {
		searches, err := h.db.Users().ListSearchFilters(ctx, userID)
		if err != nil {
			return nil, err
		}

		return GetSearchFilters200JSONResponse(*searches), nil
	})
}

func (h apiHandler) GetUserSearchFilters(ctx context.Context, request GetUserSearchFiltersRequestObject) (GetUserSearchFiltersResponseObject, error) {
	searches, err := h.db.Users().ListSearchFilters(ctx, request.UserID)
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

	if err := h.db.Users().CreateSearchFilter(ctx, filter); err != nil {
		return nil, err
	}

	return filter, nil
}

func (h apiHandler) GetSearchFilter(ctx context.Context, request GetSearchFilterRequestObject) (GetSearchFilterResponseObject, error) {
	return withCurrentUser[GetSearchFilterResponseObject](ctx, GetSearchFilter401Response{}, func(userID int64) (GetSearchFilterResponseObject, error) {
		filter, err := h.db.Users().ReadSearchFilter(ctx, userID, request.FilterID)
		if err != nil {
			return nil, fmt.Errorf("reading filter: %w", err)
		}

		return GetSearchFilter200JSONResponse(*filter), nil
	})
}

func (h apiHandler) GetUserSearchFilter(ctx context.Context, request GetUserSearchFilterRequestObject) (GetUserSearchFilterResponseObject, error) {
	filter, err := h.db.Users().ReadSearchFilter(ctx, request.UserID, request.FilterID)
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
	if _, err := h.db.Users().ReadSearchFilter(ctx, userID, filterID); err != nil {
		return err
	}

	return h.db.Users().UpdateSearchFilter(ctx, filter)
}

func (h apiHandler) DeleteSearchFilter(ctx context.Context, request DeleteSearchFilterRequestObject) (DeleteSearchFilterResponseObject, error) {
	return withCurrentUser[DeleteSearchFilterResponseObject](ctx, DeleteSearchFilter401Response{}, func(userID int64) (DeleteSearchFilterResponseObject, error) {
		if err := h.db.Users().DeleteSearchFilter(ctx, userID, request.FilterID); err != nil {
			return nil, err
		}

		return DeleteSearchFilter204Response{}, nil
	})
}

func (h apiHandler) DeleteUserSearchFilter(ctx context.Context, request DeleteUserSearchFilterRequestObject) (DeleteUserSearchFilterResponseObject, error) {
	if err := h.db.Users().DeleteSearchFilter(ctx, request.UserID, request.FilterID); err != nil {
		return nil, err
	}

	return DeleteUserSearchFilter204Response{}, nil
}
