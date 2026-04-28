package api

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"go.uber.org/mock/gomock"
)

func Test_GetUser(t *testing.T) {
	type testArgs struct {
		userID        int64
		username      string
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "user1", nil},
		{2, "user2", nil},
		{3, "", db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			expectedUser := &db.UserWithPasswordHash{
				User: models.User{
					ID:       &test.userID,
					Username: test.username,
				},
			}
			if test.expectedError != nil {
				usersDriver.EXPECT().Read(t.Context(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				usersDriver.EXPECT().Read(t.Context(), test.userID).Return(expectedUser, nil)
			}

			// Act
			resp, err := api.GetUser(t.Context(), GetUserRequestObject{UserID: test.userID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(GetUser200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if resp.ID == nil {
					t.Error("expected non-null id")
				} else if *resp.ID != *expectedUser.ID {
					t.Errorf("expected id: %d, actual id: %d", *expectedUser.ID, *resp.ID)
				}
				if resp.Username != expectedUser.Username {
					t.Errorf("expected username: %s, actual username: %s", expectedUser.Username, resp.Username)
				}
			}
		})
	}
}

func Test_GetCurrentUser(t *testing.T) {
	type testArgs struct {
		userID           *int64
		username         string
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{utils.GetPtr[int64](1), "user1", nil, reflect.TypeOf(GetCurrentUser200JSONResponse{})},
		{nil, "", nil, reflect.TypeOf(GetCurrentUser401Response{})},
		{utils.GetPtr[int64](3), "", db.ErrNotFound, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			expectedUser := &db.UserWithPasswordHash{
				User: models.User{
					ID:       test.userID,
					Username: test.username,
				},
			}
			ctx := t.Context()
			if test.userID != nil {
				ctx = context.WithValue(ctx, currentUserIDCtxKey, *test.userID)
			}
			if test.expectedError != nil {
				usersDriver.EXPECT().Read(ctx, gomock.Any()).Return(nil, test.expectedError)
			} else if test.userID != nil {
				usersDriver.EXPECT().Read(ctx, *test.userID).Return(expectedUser, nil)
			}

			// Act
			resp, err := api.GetCurrentUser(ctx, GetCurrentUserRequestObject{})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				if reflect.TypeOf(resp) != test.expectedResponse {
					t.Errorf("expected response: %v, actual response: %v", test.expectedResponse, reflect.TypeOf(resp))
				}
				if test.expectedResponse == reflect.TypeOf(GetCurrentUser200JSONResponse{}) {
					resp, ok := resp.(GetCurrentUser200JSONResponse)
					if !ok {
						t.Error("invalid response")
					}
					if resp.ID == nil {
						t.Error("expected non-null id")
					} else if *resp.ID != *expectedUser.ID {
						t.Errorf("expected id: %d, actual id: %d", *expectedUser.ID, *resp.ID)
					}
					if resp.Username != expectedUser.Username {
						t.Errorf("expected username: %s, actual username: %s", expectedUser.Username, resp.Username)
					}
				}
			}
		})
	}
}

func Test_GetAllUsers(t *testing.T) {
	type testArgs struct {
		users         []models.User
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{
			[]models.User{
				{Username: "user1"},
			},
			nil,
		},
		{[]models.User{}, errors.New("something failed")},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			if test.expectedError != nil {
				usersDriver.EXPECT().List(t.Context()).Return(&test.users, test.expectedError)
			} else {
				usersDriver.EXPECT().List(t.Context()).Return(&test.users, nil)
			}

			// Act
			resp, err := api.GetAllUsers(t.Context(), GetAllUsersRequestObject{})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				typedResp, ok := resp.(GetAllUsers200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if len(typedResp) != len(test.users) {
					t.Errorf("expected length: %d, actual length: %d", len(test.users), len(typedResp))
				}
			}
		})
	}
}

func Test_AddUser(t *testing.T) {
	type testArgs struct {
		username      string
		accessLevel   models.AccessLevel
		password      string
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"user1", models.Editor, "password", nil},
		{"user2", models.Admin, "password", nil},
		{"", models.Viewer, "", db.ErrAuthenticationFailed},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			expectedUser := models.User{
				Username:    test.username,
				AccessLevel: test.accessLevel,
			}
			if test.expectedError != nil {
				usersDriver.EXPECT().Create(t.Context(), gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				usersDriver.EXPECT().Create(t.Context(), &expectedUser, test.password).Return(nil)
			}

			// Act
			resp, err := api.AddUser(t.Context(), AddUserRequestObject{Body: &UserWithPassword{User: expectedUser, Password: test.password}})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(AddUser201JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if models.User(resp) != expectedUser {
					t.Errorf("expected user: %v, actual user: %v", expectedUser, resp)
				}
			}
		})
	}
}

func Test_SaveUser(t *testing.T) {
	type testArgs struct {
		currentUserID    int64
		requestUserID    int64
		user             models.User
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, 1, models.User{ID: utils.GetPtr[int64](1), Username: "user1", AccessLevel: models.Admin}, nil, nil, reflect.TypeOf(SaveUser204Response{})},
		{1, 1, models.User{ID: nil, Username: "user1", AccessLevel: models.Admin}, nil, nil, reflect.TypeOf(SaveUser204Response{})},

		{1, 1, models.User{ID: utils.GetPtr[int64](1), Username: "user1", AccessLevel: models.Editor}, nil, nil, reflect.TypeOf(SaveUser403Response{})},
		{1, 1, models.User{ID: nil, Username: "user1", AccessLevel: models.Editor}, nil, nil, reflect.TypeOf(SaveUser403Response{})},

		{1, 2, models.User{ID: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Editor}, nil, nil, reflect.TypeOf(SaveUser204Response{})},
		{1, 2, models.User{ID: nil, Username: "user2", AccessLevel: models.Editor}, nil, nil, reflect.TypeOf(SaveUser204Response{})},

		{1, 2, models.User{ID: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Viewer}, db.ErrNotFound, db.ErrNotFound, nil},

		{1, 3, models.User{ID: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Viewer}, nil, errMismatchedID, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().Update(ctx, gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().Update(ctx, &test.user).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveUser(ctx, SaveUserRequestObject{UserID: test.requestUserID, Body: &test.user})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				if reflect.TypeOf(resp) != test.expectedResponse {
					t.Errorf("expected response: %v, actual response: %v", test.expectedResponse, reflect.TypeOf(resp))
				}
			}
		})
	}
}

func Test_DeleteUser(t *testing.T) {
	type testArgs struct {
		currentUserID    int64
		userID           int64
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, 1, nil, nil, reflect.TypeOf(DeleteUser403Response{})},

		{1, 2, nil, nil, reflect.TypeOf(DeleteUser204Response{})},

		{1, 2, db.ErrNotFound, db.ErrNotFound, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().Delete(ctx, gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().Delete(ctx, test.userID).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.DeleteUser(ctx, DeleteUserRequestObject{UserID: test.userID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				if reflect.TypeOf(resp) != test.expectedResponse {
					t.Errorf("expected response: %v, actual response: %v", test.expectedResponse, reflect.TypeOf(resp))
				}
			}
		})
	}
}

func Test_ChangePassword(t *testing.T) {
	type testArgs struct {
		currentUserID    int64
		request          UserPasswordRequest
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"}, nil, nil, reflect.TypeOf(ChangePassword204Response{})},
		{1, UserPasswordRequest{CurrentPassword: "wrongpassword", NewPassword: "newpassword"}, db.ErrAuthenticationFailed, nil, reflect.TypeOf(ChangePassword403Response{})},
		{2, UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"}, db.ErrNotFound, nil, reflect.TypeOf(ChangePassword403Response{})},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().UpdatePassword(ctx, gomock.Any(), gomock.Any(), gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().UpdatePassword(ctx, test.currentUserID, test.request.CurrentPassword, test.request.NewPassword).Return(nil)
			}

			// Act
			resp, err := api.ChangePassword(ctx, ChangePasswordRequestObject{Body: &test.request})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				if reflect.TypeOf(resp) != test.expectedResponse {
					t.Errorf("expected response: %v, actual response: %v", test.expectedResponse, reflect.TypeOf(resp))
				}
			}
		})
	}
}

func Test_ChangeUserPassword(t *testing.T) {
	type testArgs struct {
		currentUserID    int64
		userID           int64
		request          UserPasswordRequest
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, 1, UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"}, nil, nil, reflect.TypeOf(ChangeUserPassword204Response{})},
		{1, 1, UserPasswordRequest{CurrentPassword: "wrongpassword", NewPassword: "newpassword"}, db.ErrAuthenticationFailed, nil, reflect.TypeOf(ChangeUserPassword403Response{})},
		{1, 2, UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"}, nil, nil, reflect.TypeOf(ChangeUserPassword204Response{})},
		{2, 2, UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"}, db.ErrNotFound, nil, reflect.TypeOf(ChangeUserPassword403Response{})},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().UpdatePassword(ctx, gomock.Any(), gomock.Any(), gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().UpdatePassword(ctx, test.userID, test.request.CurrentPassword, test.request.NewPassword).Return(nil)
			}

			// Act
			resp, err := api.ChangeUserPassword(ctx, ChangeUserPasswordRequestObject{UserID: test.userID, Body: &test.request})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				if reflect.TypeOf(resp) != test.expectedResponse {
					t.Errorf("expected response: %v, actual response: %v", test.expectedResponse, reflect.TypeOf(resp))
				}
			}
		})
	}
}

func getMockUsersAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockUserDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	userDriver := dbmock.NewMockUserDriver(ctrl)
	dbDriver.EXPECT().Users().AnyTimes().Return(userDriver)
	uplDriver := fileaccessmock.NewMockDriver(ctrl)
	imgCfg := fileaccess.ImageConfig{
		ImageQuality:     models.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: models.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := fileaccess.CreateImageUploader(uplDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		upl:        upl,
		db:         dbDriver,
	}
	return api, userDriver
}
