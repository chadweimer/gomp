package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/db"
	"golang.org/x/crypto/bcrypt"
)

func (h apiHandler) GetCurrentUser(ctx context.Context, _ GetCurrentUserRequestObject) (GetCurrentUserResponseObject, error) {
	userId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return GetCurrentUser401Response{}, nil
	}

	user, err := h.db.Users().Read(userId)
	if err != nil {
		fullErr := fmt.Errorf("reading user: %w", err)
		return nil, fullErr
	}

	return GetCurrentUser200JSONResponse(user.User), nil
}

func (h apiHandler) GetUser(_ context.Context, request GetUserRequestObject) (GetUserResponseObject, error) {
	user, err := h.db.Users().Read(request.UserId)
	if err != nil {
		fullErr := fmt.Errorf("reading user: %w", err)
		return nil, fullErr
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
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		fullErr := fmt.Errorf("invalid password specified: %w", err)
		return nil, fullErr
	}

	user := db.UserWithPasswordHash{
		User:         newUser.User,
		PasswordHash: string(passwordHash),
	}

	if err := h.db.Users().Create(&user); err != nil {
		return nil, err
	}

	return AddUser201JSONResponse(user.User), nil
}

func (h apiHandler) SaveUser(ctx context.Context, request SaveUserRequestObject) (SaveUserResponseObject, error) {
	user := request.Body
	if user.Id == nil {
		user.Id = &request.UserId
	} else if *user.Id != request.UserId {
		h.LogError(ctx, errMismatchedId)
		return SaveUser400Response{}, nil
	}

	if err := h.db.Users().Update(request.Body); err != nil {
		return nil, err
	}

	return SaveUser204Response{}, nil
}

func (h apiHandler) DeleteUser(ctx context.Context, request DeleteUserRequestObject) (DeleteUserResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return DeleteUser401Response{}, nil
	}

	// Don't allow deleting self
	if request.UserId == currentUserId {
		return DeleteUser403Response{}, nil
	}

	if err := h.db.Users().Delete(request.UserId); err != nil {
		return nil, err
	}

	return DeleteUser204Response{}, nil
}

func (h apiHandler) ChangePassword(ctx context.Context, request ChangePasswordRequestObject) (ChangePasswordResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return ChangePassword401Response{}, nil
	}

	if err := h.db.Users().UpdatePassword(currentUserId, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
		fullErr := fmt.Errorf("update failed: %w", err)
		h.LogError(ctx, fullErr)
		return ChangePassword403Response{}, nil
	}

	return ChangePassword204Response{}, nil
}

func (h apiHandler) ChangeUserPassword(ctx context.Context, request ChangeUserPasswordRequestObject) (ChangeUserPasswordResponseObject, error) {
	if err := h.db.Users().UpdatePassword(request.UserId, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
		fullErr := fmt.Errorf("update failed: %w", err)
		h.LogError(ctx, fullErr)
		return ChangeUserPassword403Response{}, nil
	}

	return ChangeUserPassword204Response{}, nil
}

func (h apiHandler) GetSettings(ctx context.Context, _ GetSettingsRequestObject) (GetSettingsResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return GetSettings401Response{}, nil
	}

	userSettings, err := h.db.Users().ReadSettings(currentUserId)
	if err != nil {
		fullErr := fmt.Errorf("reading user settings: %w", err)
		return nil, fullErr
	}

	// Default to the application title if the user hasn't set their own
	if userSettings.HomeTitle == nil {
		if cfg, err := h.db.AppConfiguration().Read(); err == nil {
			userSettings.HomeTitle = &cfg.Title
		}
	}

	return GetSettings200JSONResponse(*userSettings), nil
}

func (h apiHandler) GetUserSettings(_ context.Context, request GetUserSettingsRequestObject) (GetUserSettingsResponseObject, error) {
	userSettings, err := h.db.Users().ReadSettings(request.UserId)
	if err != nil {
		fullErr := fmt.Errorf("reading user settings: %w", err)
		return nil, fullErr
	}

	// Default to the application title if the user hasn't set their own
	if userSettings.HomeTitle == nil {
		if cfg, err := h.db.AppConfiguration().Read(); err == nil {
			userSettings.HomeTitle = &cfg.Title
		}
	}

	return GetUserSettings200JSONResponse(*userSettings), nil
}

func (h apiHandler) SaveSettings(ctx context.Context, request SaveSettingsRequestObject) (SaveSettingsResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return SaveSettings401Response{}, nil
	}

	userSettings := request.Body

	// Make sure the ID is set in the object
	if userSettings.UserId == nil {
		userSettings.UserId = &currentUserId
	} else if *userSettings.UserId != currentUserId {
		h.LogError(ctx, errMismatchedId)
		return SaveSettings400Response{}, nil
	}

	if err := h.db.Users().UpdateSettings(userSettings); err != nil {
		fullErr := fmt.Errorf("updating user settings: %w", err)
		return nil, fullErr
	}

	return SaveSettings204Response{}, nil
}

func (h apiHandler) SaveUserSettings(ctx context.Context, request SaveUserSettingsRequestObject) (SaveUserSettingsResponseObject, error) {
	userSettings := request.Body

	// Make sure the ID is set in the object
	if userSettings.UserId == nil {
		userSettings.UserId = &request.UserId
	} else if *userSettings.UserId != request.UserId {
		h.LogError(ctx, errMismatchedId)
		return SaveUserSettings400Response{}, nil
	}

	if err := h.db.Users().UpdateSettings(userSettings); err != nil {
		fullErr := fmt.Errorf("updating user settings: %w", err)
		return nil, fullErr
	}

	return SaveUserSettings204Response{}, nil
}

func (h apiHandler) GetSearchFilters(ctx context.Context, _ GetSearchFiltersRequestObject) (GetSearchFiltersResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return GetSearchFilters401Response{}, nil
	}

	searches, err := h.db.Users().ListSearchFilters(currentUserId)
	if err != nil {
		return nil, err
	}

	return GetSearchFilters200JSONResponse(*searches), nil
}

func (h apiHandler) GetUserSearchFilters(_ context.Context, request GetUserSearchFiltersRequestObject) (GetUserSearchFiltersResponseObject, error) {
	searches, err := h.db.Users().ListSearchFilters(request.UserId)
	if err != nil {
		return nil, err
	}

	return GetUserSearchFilters200JSONResponse(*searches), nil
}

func (h apiHandler) AddSearchFilter(ctx context.Context, request AddSearchFilterRequestObject) (AddSearchFilterResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return AddSearchFilter401Response{}, nil
	}

	filter := request.Body

	// Make sure the ID is set in the object
	if filter.UserId == nil {
		filter.UserId = &currentUserId
	} else if *filter.UserId != currentUserId {
		h.LogError(ctx, errMismatchedId)
		return AddSearchFilter400Response{}, nil
	}

	if err := h.db.Users().CreateSearchFilter(filter); err != nil {
		return nil, err
	}

	return AddSearchFilter201JSONResponse(*filter), nil
}

func (h apiHandler) AddUserSearchFilter(ctx context.Context, request AddUserSearchFilterRequestObject) (AddUserSearchFilterResponseObject, error) {
	filter := request.Body

	// Make sure the ID is set in the object
	if filter.UserId == nil {
		filter.UserId = &request.UserId
	} else if *filter.UserId != request.UserId {
		h.LogError(ctx, errMismatchedId)
		return AddUserSearchFilter400Response{}, nil
	}

	if err := h.db.Users().CreateSearchFilter(filter); err != nil {
		return nil, err
	}

	return AddUserSearchFilter201JSONResponse(*filter), nil
}

func (h apiHandler) GetSearchFilter(ctx context.Context, request GetSearchFilterRequestObject) (GetSearchFilterResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return GetSearchFilter401Response{}, nil
	}

	filter, err := h.db.Users().ReadSearchFilter(currentUserId, request.FilterId)
	if err != nil {
		fullErr := fmt.Errorf("reading filter: %w", err)
		return nil, fullErr
	}

	return GetSearchFilter200JSONResponse(*filter), nil
}

func (h apiHandler) GetUserSearchFilter(_ context.Context, request GetUserSearchFilterRequestObject) (GetUserSearchFilterResponseObject, error) {
	filter, err := h.db.Users().ReadSearchFilter(request.UserId, request.FilterId)
	if err != nil {
		fullErr := fmt.Errorf("reading filter: %w", err)
		return nil, fullErr
	}

	return GetUserSearchFilter200JSONResponse(*filter), nil
}

func (h apiHandler) SaveSearchFilter(ctx context.Context, request SaveSearchFilterRequestObject) (SaveSearchFilterResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return SaveSearchFilter401Response{}, nil
	}

	filter := request.Body

	// Make sure the ID is set in the object
	if filter.Id == nil {
		filter.Id = &request.FilterId
	} else if *filter.Id != request.FilterId {
		h.LogError(ctx, errMismatchedId)
		return SaveSearchFilter400Response{}, nil
	}

	// Make sure the UserId is set in the object
	if filter.UserId == nil {
		filter.UserId = &currentUserId
	} else if *filter.UserId != currentUserId {
		h.LogError(ctx, errMismatchedId)
		return SaveSearchFilter400Response{}, nil
	}

	// Check that the filter exists for the specified user
	if _, err := h.db.Users().ReadSearchFilter(currentUserId, request.FilterId); err != nil {
		return nil, err
	}

	if err := h.db.Users().UpdateSearchFilter(filter); err != nil {
		return nil, err
	}

	return SaveSearchFilter204Response{}, nil
}

func (h apiHandler) SaveUserSearchFilter(ctx context.Context, request SaveUserSearchFilterRequestObject) (SaveUserSearchFilterResponseObject, error) {
	filter := request.Body

	// Make sure the ID is set in the object
	if filter.Id == nil {
		filter.Id = &request.FilterId
	} else if *filter.Id != request.FilterId {
		h.LogError(ctx, errMismatchedId)
		return SaveUserSearchFilter400Response{}, nil
	}

	// Make sure the UserId is set in the object
	if filter.UserId == nil {
		filter.UserId = &request.UserId
	} else if *filter.UserId != request.UserId {
		h.LogError(ctx, errMismatchedId)
		return SaveUserSearchFilter400Response{}, nil
	}

	// Check that the filter exists for the specified user
	if _, err := h.db.Users().ReadSearchFilter(request.UserId, request.FilterId); err != nil {
		return nil, err
	}

	if err := h.db.Users().UpdateSearchFilter(filter); err != nil {
		return nil, err
	}

	return SaveUserSearchFilter204Response{}, nil
}

func (h apiHandler) DeleteSearchFilter(ctx context.Context, request DeleteSearchFilterRequestObject) (DeleteSearchFilterResponseObject, error) {
	currentUserId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		h.LogError(ctx, err)
		return DeleteSearchFilter401Response{}, nil
	}

	if err := h.db.Users().DeleteSearchFilter(currentUserId, request.FilterId); err != nil {
		return nil, err
	}

	return DeleteSearchFilter204Response{}, nil
}

func (h apiHandler) DeleteUserSearchFilter(_ context.Context, request DeleteUserSearchFilterRequestObject) (DeleteUserSearchFilterResponseObject, error) {
	if err := h.db.Users().DeleteSearchFilter(request.UserId, request.FilterId); err != nil {
		return nil, err
	}

	return DeleteUserSearchFilter204Response{}, nil
}
