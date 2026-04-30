package api

import (
	"context"
	"errors"
	"fmt"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
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
	logger := infra.GetLoggerFromContext(ctx)

	userSettings, err := h.getUserSettingsImpl(ctx, request.UserID)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return GetUserSettings404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to get user settings",
			"error", err,
			"user-id", request.UserID)
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
	logger := infra.GetLoggerFromContext(ctx)

	return withCurrentUser[SaveSettingsResponseObject](ctx, SaveSettings401Response{}, func(userID int64) (SaveSettingsResponseObject, error) {
		if err := h.saveUserSettingsImpl(ctx, userID, request.Body); err != nil {
			if errors.Is(err, errMismatchedID) {
				logger.ErrorContext(ctx, "Request ID does not match user ID",
					"request-id", userID,
					"user-id", *request.Body.UserID)
				return SaveSettings400Response{}, nil
			}
			logger.ErrorContext(ctx, "Failed to save user settings",
				"error", err,
				"user-id", userID)
			return nil, err
		}

		return SaveSettings204Response{}, nil
	})
}

func (h apiHandler) SaveUserSettings(ctx context.Context, request SaveUserSettingsRequestObject) (SaveUserSettingsResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if err := h.saveUserSettingsImpl(ctx, request.UserID, request.Body); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return SaveUserSettings404Response{}, nil
		} else if errors.Is(err, errMismatchedID) {
			logger.ErrorContext(ctx, "Request ID does not match user ID",
				"request-id", request.UserID,
				"user-id", *request.Body.UserID)
			return SaveUserSettings400Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to save user settings",
			"error", err,
			"user-id", request.UserID)
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
