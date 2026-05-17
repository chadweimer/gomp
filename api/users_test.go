package api

import (
	"context"
	"database/sql"
	"errors"
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
		name             string
		userID           int64
		username         string
		dbError          error
		expectedError    error
		expectedResponse GetUserResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "success",
			userID:           1,
			username:         "user1",
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: GetUser200JSONResponse{ID: utils.GetPtr[int64](1), Username: "user1"},
		},
		{
			name:             "not found",
			userID:           2,
			username:         "",
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: GetUser404Response{},
		},
		{
			name:             "db error",
			userID:           3,
			username:         "",
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			expectedUser := &db.UserWithPasswordHash{
				User: models.User{
					ID:       &test.userID,
					Username: test.username,
				},
			}
			if test.dbError != nil {
				usersDriver.EXPECT().Read(t.Context(), gomock.Any()).Return(nil, test.dbError)
			} else {
				usersDriver.EXPECT().Read(t.Context(), test.userID).Return(expectedUser, nil)
			}

			// Act
			resp, err := api.GetUser(t.Context(), GetUserRequestObject{UserID: test.userID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch expected := test.expectedResponse.(type) {
				case GetUser200JSONResponse:
					got, ok := resp.(GetUser200JSONResponse)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
					if got.ID == nil {
						t.Error("expected non-null id")
					} else if *got.ID != *expected.ID {
						t.Errorf("expected id: %d, actual id: %d", *expected.ID, *got.ID)
					}
					if got.Username != expected.Username {
						t.Errorf("expected username: %s, actual username: %s", expected.Username, got.Username)
					}
				case GetUser404Response:
					if _, ok := resp.(GetUser404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Fatalf("unexpected expected response type: %T", expected)
				}
			}
		})
	}
}

func Test_GetCurrentUser(t *testing.T) {
	type testArgs struct {
		name             string
		userID           *int64
		username         string
		expectedError    error
		expectedResponse GetCurrentUserResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "success",
			userID:           utils.GetPtr[int64](1),
			username:         "user1",
			expectedError:    nil,
			expectedResponse: GetCurrentUser200JSONResponse{},
		},
		{
			name:             "unauthorized",
			userID:           nil,
			username:         "",
			expectedError:    nil,
			expectedResponse: GetCurrentUser401Response{},
		},
		{
			name:             "not found",
			userID:           utils.GetPtr[int64](3),
			username:         "",
			expectedError:    db.ErrNotFound,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
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
				switch expected := test.expectedResponse.(type) {
				case GetCurrentUser200JSONResponse:
					got, ok := resp.(GetCurrentUser200JSONResponse)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
					if got.ID == nil {
						t.Error("expected non-null id")
					} else if *got.ID != *expectedUser.ID {
						t.Errorf("expected id: %d, actual id: %d", *expectedUser.ID, *got.ID)
					}
					if got.Username != expectedUser.Username {
						t.Errorf("expected username: %s, actual username: %s", expectedUser.Username, got.Username)
					}
				case GetCurrentUser401Response:
					if _, ok := resp.(GetCurrentUser401Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Fatalf("unexpected expected response type: %T", expected)
				}
			}
		})
	}
}

func Test_GetAllUsers(t *testing.T) {
	type testArgs struct {
		name             string
		users            []models.User
		expectedError    error
		expectedResponse GetAllUsersResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name: "success",
			users: []models.User{
				{Username: "user1"},
			},
			expectedError:    nil,
			expectedResponse: GetAllUsers200JSONResponse{},
		},
		{
			name:             "failure",
			users:            []models.User{},
			expectedError:    errors.New("something failed"),
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
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
				switch test.expectedResponse.(type) {
				case GetAllUsers200JSONResponse:
					got, ok := resp.(GetAllUsers200JSONResponse)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
					if len(got) != len(test.users) {
						t.Errorf("expected length: %d, actual length: %d", len(test.users), len(got))
					}
				default:
					t.Fatalf("unexpected expected response type: %T", test.expectedResponse)
				}
			}
		})
	}
}

func Test_AddUser(t *testing.T) {
	type testArgs struct {
		name             string
		username         string
		accessLevel      models.AccessLevel
		password         string
		expectedError    error
		expectedResponse AddUserResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Editor user",
			username:         "user1",
			accessLevel:      models.Editor,
			password:         "password",
			expectedError:    nil,
			expectedResponse: AddUser201JSONResponse{Username: "user1", AccessLevel: models.Editor},
		},
		{
			name:             "Admin user",
			username:         "user2",
			accessLevel:      models.Admin,
			password:         "password",
			expectedError:    nil,
			expectedResponse: AddUser201JSONResponse{Username: "user2", AccessLevel: models.Admin},
		},
		{
			name:             "failure",
			username:         "",
			accessLevel:      models.Viewer,
			password:         "",
			expectedError:    db.ErrAuthenticationFailed,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
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
				switch test.expectedResponse.(type) {
				case AddUser201JSONResponse:
					got, ok := resp.(AddUser201JSONResponse)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
					if got.Username != expectedUser.Username {
						t.Errorf("expected username: %s, actual username: %s", expectedUser.Username, got.Username)
					} else if got.AccessLevel != expectedUser.AccessLevel {
						t.Errorf("expected access level: %v, actual access level: %v", expectedUser.AccessLevel, got.AccessLevel)
					}
				default:
					t.Fatalf("unexpected expected response type: %T", test.expectedResponse)
				}
			}
		})
	}
}

func Test_SaveUser(t *testing.T) {
	type testArgs struct {
		name             string
		currentUserID    int64
		requestUserID    int64
		user             models.User
		dbError          error
		expectedError    error
		expectedResponse SaveUserResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "admin updating self",
			currentUserID:    1,
			requestUserID:    1,
			user:             models.User{ID: utils.GetPtr[int64](1), Username: "user1", AccessLevel: models.Admin},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUser204Response{},
		},
		{
			name:             "admin updating self with nil ID",
			currentUserID:    1,
			requestUserID:    1,
			user:             models.User{ID: nil, Username: "user1", AccessLevel: models.Admin},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUser204Response{},
		},
		{
			name:             "admin updating self with editor access",
			currentUserID:    1,
			requestUserID:    1,
			user:             models.User{ID: utils.GetPtr[int64](1), Username: "user1", AccessLevel: models.Editor},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUser403Response{},
		},
		{
			name:             "admin updating self with nil ID and editor access",
			currentUserID:    1,
			requestUserID:    1,
			user:             models.User{ID: nil, Username: "user1", AccessLevel: models.Editor},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUser403Response{},
		},
		{
			name:             "admin updating another user with editor access",
			currentUserID:    1,
			requestUserID:    2,
			user:             models.User{ID: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Editor},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUser204Response{},
		},
		{
			name:             "admin updating another user with nil ID and editor access",
			currentUserID:    1,
			requestUserID:    2,
			user:             models.User{ID: nil, Username: "user2", AccessLevel: models.Editor},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUser204Response{},
		},
		{
			name:             "admin updating a non-existent user",
			currentUserID:    1,
			requestUserID:    2,
			user:             models.User{ID: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Viewer},
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: SaveUser404Response{},
		},
		{
			name:             "admin updating another user with mismatched ID",
			currentUserID:    1,
			requestUserID:    3,
			user:             models.User{ID: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Viewer},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUser400Response{},
		},
		{
			name:             "DB error when updating user",
			currentUserID:    1,
			requestUserID:    2,
			user:             models.User{ID: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Viewer},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.dbError != nil {
				usersDriver.EXPECT().Update(ctx, gomock.Any()).Return(test.dbError)
			} else {
				usersDriver.EXPECT().Update(ctx, &test.user).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveUser(ctx, SaveUserRequestObject{UserID: test.requestUserID, Body: &test.user})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case SaveUser204Response:
					if _, ok := resp.(SaveUser204Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case SaveUser400Response:
					if _, ok := resp.(SaveUser400Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case SaveUser403Response:
					if _, ok := resp.(SaveUser403Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case SaveUser404Response:
					if _, ok := resp.(SaveUser404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Fatalf("unexpected expected response type: %T", test.expectedResponse)
				}
			}
		})
	}
}

func Test_DeleteUser(t *testing.T) {
	type testArgs struct {
		name             string
		currentUserID    int64
		userID           int64
		dbError          error
		expectedError    error
		expectedResponse DeleteUserResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "admin deleting self",
			currentUserID:    1,
			userID:           1,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: DeleteUser403Response{},
		},
		{
			name:             "admin deleting another user",
			currentUserID:    1,
			userID:           2,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: DeleteUser204Response{},
		},
		{
			name:             "admin deleting non-existent user",
			currentUserID:    1,
			userID:           2,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: DeleteUser404Response{},
		},
		{
			name:             "DB error when deleting user",
			currentUserID:    1,
			userID:           2,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.dbError != nil {
				usersDriver.EXPECT().Delete(ctx, gomock.Any()).Return(test.dbError)
			} else {
				usersDriver.EXPECT().Delete(ctx, test.userID).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.DeleteUser(ctx, DeleteUserRequestObject{UserID: test.userID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case DeleteUser204Response:
					if _, ok := resp.(DeleteUser204Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case DeleteUser403Response:
					if _, ok := resp.(DeleteUser403Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case DeleteUser404Response:
					if _, ok := resp.(DeleteUser404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Fatalf("unexpected expected response type: %T", test.expectedResponse)
				}
			}
		})
	}
}

func Test_ChangePassword(t *testing.T) {
	type testArgs struct {
		name             string
		currentUserID    int64
		request          UserPasswordRequest
		dbError          error
		expectedError    error
		expectedResponse ChangePasswordResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Change password successfully",
			currentUserID:    1,
			request:          UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: ChangePassword204Response{},
		},
		{
			name:             "Change password with wrong current password",
			currentUserID:    1,
			request:          UserPasswordRequest{CurrentPassword: "wrongpassword", NewPassword: "newpassword"},
			dbError:          db.ErrAuthenticationFailed,
			expectedError:    nil,
			expectedResponse: ChangePassword403Response{},
		},
		{
			name:             "DB error when changing password",
			currentUserID:    1,
			request:          UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.dbError != nil {
				usersDriver.EXPECT().UpdatePassword(ctx, gomock.Any(), gomock.Any(), gomock.Any()).Return(test.dbError)
			} else {
				usersDriver.EXPECT().UpdatePassword(ctx, test.currentUserID, test.request.CurrentPassword, test.request.NewPassword).Return(nil)
			}

			// Act
			resp, err := api.ChangePassword(ctx, ChangePasswordRequestObject{Body: &test.request})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case ChangePassword204Response:
					if _, ok := resp.(ChangePassword204Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case ChangePassword403Response:
					if _, ok := resp.(ChangePassword403Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Fatalf("unexpected expected response type: %T", test.expectedResponse)
				}
			}
		})
	}
}

func Test_ChangeUserPassword(t *testing.T) {
	type testArgs struct {
		name             string
		currentUserID    int64
		userID           int64
		request          UserPasswordRequest
		dbError          error
		expectedError    error
		expectedResponse ChangeUserPasswordResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Change password successfully",
			currentUserID:    1,
			userID:           1,
			request:          UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: ChangeUserPassword204Response{},
		},
		{
			name:             "Change password with wrong current password",
			currentUserID:    1,
			userID:           1,
			request:          UserPasswordRequest{CurrentPassword: "wrongpassword", NewPassword: "newpassword"},
			dbError:          db.ErrAuthenticationFailed,
			expectedError:    nil,
			expectedResponse: ChangeUserPassword403Response{},
		},
		{
			name:             "Change password for another user successfully",
			currentUserID:    1,
			userID:           2,
			request:          UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: ChangeUserPassword204Response{},
		},
		{
			name:             "Change password for non-existent user",
			currentUserID:    2,
			userID:           2,
			request:          UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"},
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: ChangeUserPassword404Response{},
		},
		{
			name:             "DB error when changing password",
			currentUserID:    1,
			userID:           2,
			request:          UserPasswordRequest{CurrentPassword: "password", NewPassword: "newpassword"},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.dbError != nil {
				usersDriver.EXPECT().UpdatePassword(ctx, gomock.Any(), gomock.Any(), gomock.Any()).Return(test.dbError)
			} else {
				usersDriver.EXPECT().UpdatePassword(ctx, test.userID, test.request.CurrentPassword, test.request.NewPassword).Return(nil)
			}

			// Act
			resp, err := api.ChangeUserPassword(ctx, ChangeUserPasswordRequestObject{UserID: test.userID, Body: &test.request})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case ChangeUserPassword204Response:
					if _, ok := resp.(ChangeUserPassword204Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case ChangeUserPassword403Response:
					if _, ok := resp.(ChangeUserPassword403Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case ChangeUserPassword404Response:
					if _, ok := resp.(ChangeUserPassword404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Fatalf("unexpected expected response type: %T", test.expectedResponse)
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
