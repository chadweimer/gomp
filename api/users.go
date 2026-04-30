package api

import (
	"context"
	"errors"
	"fmt"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
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
	logger := infra.GetLoggerFromContext(ctx)

	user, err := h.db.Users().Read(ctx, request.UserID)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return GetUser404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to get user",
			"error", err,
			"user-id", request.UserID)
		return nil, err
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
	logger := infra.GetLoggerFromContext(ctx)

	return withCurrentUser[SaveUserResponseObject](ctx, SaveUser401Response{}, func(currentUserID int64) (SaveUserResponseObject, error) {
		user := request.Body
		if user.ID == nil {
			user.ID = &request.UserID
		} else if *user.ID != request.UserID {
			logger.ErrorContext(ctx, "Request ID does not match user ID",
				"request-id", request.UserID,
				"user-id", *user.ID)
			return SaveUser400Response{}, nil
		}

		// Don't allow admins to make themselves non-admins
		if request.UserID == currentUserID && user.AccessLevel != models.Admin {
			return SaveUser403Response{}, nil
		}

		if err := h.db.Users().Update(ctx, request.Body); err != nil {
			if errors.Is(err, db.ErrNotFound) {
				return SaveUser404Response{}, nil
			}
			logger.ErrorContext(ctx, "Failed to update user",
				"error", err,
				"user-id", request.UserID)
			return nil, err
		}

		return SaveUser204Response{}, nil
	})
}

func (h apiHandler) DeleteUser(ctx context.Context, request DeleteUserRequestObject) (DeleteUserResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	return withCurrentUser[DeleteUserResponseObject](ctx, DeleteUser401Response{}, func(userID int64) (DeleteUserResponseObject, error) {
		// Don't allow deleting self
		if request.UserID == userID {
			return DeleteUser403Response{}, nil
		}

		if err := h.db.Users().Delete(ctx, request.UserID); err != nil {
			if errors.Is(err, db.ErrNotFound) {
				return DeleteUser404Response{}, nil
			}
			logger.ErrorContext(ctx, "Failed to delete user",
				"error", err,
				"user-id", request.UserID)
			return nil, err
		}

		return DeleteUser204Response{}, nil
	})
}

func (h apiHandler) ChangePassword(ctx context.Context, request ChangePasswordRequestObject) (ChangePasswordResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	return withCurrentUser[ChangePasswordResponseObject](ctx, ChangePassword401Response{}, func(userID int64) (ChangePasswordResponseObject, error) {
		if err := h.db.Users().UpdatePassword(ctx, userID, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
			if errors.Is(err, db.ErrAuthenticationFailed) {
				return ChangePassword403Response{}, nil
			}
			logger.ErrorContext(ctx, "Failed to change password",
				"error", err)
			return nil, err
		}

		return ChangePassword204Response{}, nil
	})
}

func (h apiHandler) ChangeUserPassword(ctx context.Context, request ChangeUserPasswordRequestObject) (ChangeUserPasswordResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if err := h.db.Users().UpdatePassword(ctx, request.UserID, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return ChangeUserPassword404Response{}, nil
		} else if errors.Is(err, db.ErrAuthenticationFailed) {
			return ChangeUserPassword403Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to change user password",
			"error", err,
			"user-id", request.UserID)
		return nil, err
	}

	return ChangeUserPassword204Response{}, nil
}
