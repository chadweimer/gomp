package api

import (
	"context"
	"fmt"

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
			infra.GetLoggerFromContext(ctx).Error("update failed", "error", err)
			return ChangePassword403Response{}, nil
		}

		return ChangePassword204Response{}, nil
	})
}

func (h apiHandler) ChangeUserPassword(ctx context.Context, request ChangeUserPasswordRequestObject) (ChangeUserPasswordResponseObject, error) {
	if err := h.db.Users().UpdatePassword(ctx, request.UserID, request.Body.CurrentPassword, request.Body.NewPassword); err != nil {
		infra.GetLoggerFromContext(ctx).Error("update failed", "error", err)
		return ChangeUserPassword403Response{}, nil
	}

	return ChangeUserPassword204Response{}, nil
}
