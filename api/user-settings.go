package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
)

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
	userSettings, err := h.db.UserSettings().Read(ctx, userID)
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

	if err := h.db.UserSettings().Update(ctx, userSettings); err != nil {
		return fmt.Errorf("updating user settings: %w", err)
	}

	return nil
}
