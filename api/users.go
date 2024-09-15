package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
)

func (h apiHandler) GetCurrentUser(ctx context.Context, _ GetCurrentUserRequestObject) (GetCurrentUserResponseObject, error) {
	return withCurrentUser[GetCurrentUserResponseObject](ctx, GetCurrentUser401Response{}, func(userId int64) (GetCurrentUserResponseObject, error) {
		user, err := h.db.Users().Read(userId)
		if err != nil {
			return nil, fmt.Errorf("reading user: %w", err)
		}

		return GetCurrentUser200JSONResponse(user.User), nil
	})
}

func (h apiHandler) GetUser(_ context.Context, request GetUserRequestObject) (GetUserResponseObject, error) {
	user, err := h.db.Users().Read(request.UserId)
	if err != nil {
		return nil, fmt.Errorf("reading user: %w", err)
	}

	return GetUser200JSONResponse(user.User), nil
}

func (h apiHandler) GetAllUsers(_ context.Context, _ GetAllUsersRequestObject) (GetAllUsersResponseObject, error) {
	// Add pagination?
	users, err := h.db.Users().List()
	if err != nil {
		return nil, err
	}

	return GetAllUsers200JSONResponse(*users), nil
}

func (h apiHandler) AddUser(_ context.Context, request AddUserRequestObject) (AddUserResponseObject, error) {
	newUser := request.Body

	if err := h.db.Users().Create(&newUser.User, newUser.Password); err != nil {
		return nil, err
	}

	return AddUser201JSONResponse(newUser.User), nil
}

func (h apiHandler) SaveUser(ctx context.Context, request SaveUserRequestObject) (SaveUserResponseObject, error) {
	return withCurrentUser[SaveUserResponseObject](ctx, SaveUser401Response{}, func(currentUserId int64) (SaveUserResponseObject, error) {
		user := request.Body
		if user.Id == nil {
			user.Id = &request.UserId
		} else if *user.Id != request.UserId {
			return nil, errMismatchedId
		}

		// Don't allow admins to make themselves non-admins
		if request.UserId == currentUserId && user.AccessLevel != models.Admin {
			return SaveUser403Response{}, nil
		}

		if err := h.db.Users().Update(request.Body); err != nil {
			return nil, err
		}

		return SaveUser204Response{}, nil
	})
}

func (h apiHandler) DeleteUser(ctx context.Context, request DeleteUserRequestObject) (DeleteUserResponseObject, error) {
	return withCurrentUser[DeleteUserResponseObject](ctx, DeleteUser401Response{}, func(userId int64) (DeleteUserResponseObject, error) {
		// Don't allow deleting self
		if request.UserId == userId {
			return DeleteUser403Response{}, nil
		}

		if err := h.db.Users().Delete(request.UserId); err != nil {
			return nil, err
		}

		return DeleteUser204Response{}, nil
	})
}

func (h apiHandler) ChangePassword(ctx context.Context, request ChangePasswordRequestObject) (ChangePasswordResponseObject, error) {
	return withCurrentUser[ChangePasswordResponseObject](ctx, ChangePassword401Response{}, func(userId int64) (ChangePasswordResponseObject, error) {
		if err := h.db.Users().UpdatePassword(userId, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
			logger(ctx).Error("update failed", "error", err)
			return ChangePassword403Response{}, nil
		}

		return ChangePassword204Response{}, nil
	})
}

func (h apiHandler) ChangeUserPassword(ctx context.Context, request ChangeUserPasswordRequestObject) (ChangeUserPasswordResponseObject, error) {
	if err := h.db.Users().UpdatePassword(request.UserId, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
		logger(ctx).Error("update failed", "error", err)
		return ChangeUserPassword403Response{}, nil
	}

	return ChangeUserPassword204Response{}, nil
}

func (h apiHandler) GetSettings(ctx context.Context, _ GetSettingsRequestObject) (GetSettingsResponseObject, error) {
	return withCurrentUser[GetSettingsResponseObject](ctx, GetSettings401Response{}, func(userId int64) (GetSettingsResponseObject, error) {
		userSettings, err := h.getUserSettingsImpl(userId)
		if err != nil {
			return nil, err
		}

		return GetSettings200JSONResponse(*userSettings), nil
	})
}

func (h apiHandler) GetUserSettings(_ context.Context, request GetUserSettingsRequestObject) (GetUserSettingsResponseObject, error) {
	userSettings, err := h.getUserSettingsImpl(request.UserId)
	if err != nil {
		return nil, err
	}

	return GetUserSettings200JSONResponse(*userSettings), nil
}

func (h apiHandler) getUserSettingsImpl(userId int64) (*models.UserSettings, error) {
	userSettings, err := h.db.Users().ReadSettings(userId)
	if err != nil {
		return nil, fmt.Errorf("reading user settings: %w", err)
	}

	// Default to the application title if the user hasn't set their own
	if userSettings.HomeTitle == nil {
		if cfg, err := h.db.AppConfiguration().Read(); err == nil {
			userSettings.HomeTitle = &cfg.Title
		}
	}

	return userSettings, nil
}

func (h apiHandler) SaveSettings(ctx context.Context, request SaveSettingsRequestObject) (SaveSettingsResponseObject, error) {
	return withCurrentUser[SaveSettingsResponseObject](ctx, SaveSettings401Response{}, func(userId int64) (SaveSettingsResponseObject, error) {
		if err := h.saveUserSettingsImpl(userId, request.Body); err != nil {
			return nil, err
		}

		return SaveSettings204Response{}, nil
	})
}

func (h apiHandler) SaveUserSettings(_ context.Context, request SaveUserSettingsRequestObject) (SaveUserSettingsResponseObject, error) {
	if err := h.saveUserSettingsImpl(request.UserId, request.Body); err != nil {
		return nil, err
	}

	return SaveUserSettings204Response{}, nil
}

func (h apiHandler) saveUserSettingsImpl(userId int64, userSettings *models.UserSettings) error {
	// Make sure the ID is set in the object
	if userSettings.UserId == nil {
		userSettings.UserId = &userId
	} else if *userSettings.UserId != userId {
		return errMismatchedId
	}

	if err := h.db.Users().UpdateSettings(userSettings); err != nil {
		return fmt.Errorf("updating user settings: %w", err)
	}

	return nil
}

func (h apiHandler) GetSearchFilters(ctx context.Context, _ GetSearchFiltersRequestObject) (GetSearchFiltersResponseObject, error) {
	return withCurrentUser[GetSearchFiltersResponseObject](ctx, GetSearchFilters401Response{}, func(userId int64) (GetSearchFiltersResponseObject, error) {
		searches, err := h.db.Users().ListSearchFilters(userId)
		if err != nil {
			return nil, err
		}

		return GetSearchFilters200JSONResponse(*searches), nil
	})
}

func (h apiHandler) GetUserSearchFilters(_ context.Context, request GetUserSearchFiltersRequestObject) (GetUserSearchFiltersResponseObject, error) {
	searches, err := h.db.Users().ListSearchFilters(request.UserId)
	if err != nil {
		return nil, err
	}

	return GetUserSearchFilters200JSONResponse(*searches), nil
}

func (h apiHandler) AddSearchFilter(ctx context.Context, request AddSearchFilterRequestObject) (AddSearchFilterResponseObject, error) {
	return withCurrentUser[AddSearchFilterResponseObject](ctx, AddSearchFilter401Response{}, func(userId int64) (AddSearchFilterResponseObject, error) {
		filter, err := h.addUserSearchFilterImpl(userId, request.Body)
		if err != nil {
			return nil, err
		}

		return AddSearchFilter201JSONResponse(*filter), nil
	})
}

func (h apiHandler) AddUserSearchFilter(_ context.Context, request AddUserSearchFilterRequestObject) (AddUserSearchFilterResponseObject, error) {
	filter, err := h.addUserSearchFilterImpl(request.UserId, request.Body)
	if err != nil {
		return nil, err
	}

	return AddUserSearchFilter201JSONResponse(*filter), nil
}

func (h apiHandler) addUserSearchFilterImpl(userId int64, filter *models.SavedSearchFilter) (*models.SavedSearchFilter, error) {
	// Make sure the ID is set in the object
	if filter.UserId == nil {
		filter.UserId = &userId
	} else if *filter.UserId != userId {
		return nil, errMismatchedId
	}

	if err := h.db.Users().CreateSearchFilter(filter); err != nil {
		return nil, err
	}

	return filter, nil
}

func (h apiHandler) GetSearchFilter(ctx context.Context, request GetSearchFilterRequestObject) (GetSearchFilterResponseObject, error) {
	return withCurrentUser[GetSearchFilterResponseObject](ctx, GetSearchFilter401Response{}, func(userId int64) (GetSearchFilterResponseObject, error) {
		filter, err := h.db.Users().ReadSearchFilter(userId, request.FilterId)
		if err != nil {
			return nil, fmt.Errorf("reading filter: %w", err)
		}

		return GetSearchFilter200JSONResponse(*filter), nil
	})
}

func (h apiHandler) GetUserSearchFilter(_ context.Context, request GetUserSearchFilterRequestObject) (GetUserSearchFilterResponseObject, error) {
	filter, err := h.db.Users().ReadSearchFilter(request.UserId, request.FilterId)
	if err != nil {
		return nil, fmt.Errorf("reading filter: %w", err)
	}

	return GetUserSearchFilter200JSONResponse(*filter), nil
}

func (h apiHandler) SaveSearchFilter(ctx context.Context, request SaveSearchFilterRequestObject) (SaveSearchFilterResponseObject, error) {
	return withCurrentUser[SaveSearchFilterResponseObject](ctx, SaveSearchFilter401Response{}, func(userId int64) (SaveSearchFilterResponseObject, error) {
		if err := h.saveUserSearchFilterImpl(userId, request.FilterId, request.Body); err != nil {
			return nil, err
		}

		return SaveSearchFilter204Response{}, nil
	})
}

func (h apiHandler) SaveUserSearchFilter(_ context.Context, request SaveUserSearchFilterRequestObject) (SaveUserSearchFilterResponseObject, error) {
	if err := h.saveUserSearchFilterImpl(request.UserId, request.FilterId, request.Body); err != nil {
		return nil, err
	}

	return SaveUserSearchFilter204Response{}, nil
}

func (h apiHandler) saveUserSearchFilterImpl(userId int64, filterId int64, filter *models.SavedSearchFilter) error {
	// Make sure the ID is set in the object
	if filter.Id == nil {
		filter.Id = &filterId
	} else if *filter.Id != filterId {
		return errMismatchedId
	}

	// Make sure the UserId is set in the object
	if filter.UserId == nil {
		filter.UserId = &userId
	} else if *filter.UserId != userId {
		return errMismatchedId
	}

	// Check that the filter exists for the specified user
	if _, err := h.db.Users().ReadSearchFilter(userId, filterId); err != nil {
		return err
	}

	return h.db.Users().UpdateSearchFilter(filter)
}

func (h apiHandler) DeleteSearchFilter(ctx context.Context, request DeleteSearchFilterRequestObject) (DeleteSearchFilterResponseObject, error) {
	return withCurrentUser[DeleteSearchFilterResponseObject](ctx, DeleteSearchFilter401Response{}, func(userId int64) (DeleteSearchFilterResponseObject, error) {
		if err := h.db.Users().DeleteSearchFilter(userId, request.FilterId); err != nil {
			return nil, err
		}

		return DeleteSearchFilter204Response{}, nil
	})
}

func (h apiHandler) DeleteUserSearchFilter(_ context.Context, request DeleteUserSearchFilterRequestObject) (DeleteUserSearchFilterResponseObject, error) {
	if err := h.db.Users().DeleteSearchFilter(request.UserId, request.FilterId); err != nil {
		return nil, err
	}

	return DeleteUserSearchFilter204Response{}, nil
}
