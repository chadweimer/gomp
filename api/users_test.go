package api

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/chadweimer/gomp/utils"
	"github.com/golang/mock/gomock"
)

func Test_GetUser(t *testing.T) {
	type testArgs struct {
		userId        int64
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

			api, usersDriver := getMockUsersApi(ctrl)
			expectedUser := &db.UserWithPasswordHash{
				User: models.User{
					Id:       &test.userId,
					Username: test.username,
				},
			}
			if test.expectedError != nil {
				usersDriver.EXPECT().Read(gomock.Any()).Return(nil, test.expectedError)
			} else {
				usersDriver.EXPECT().Read(test.userId).Return(expectedUser, nil)
			}

			// Act
			resp, err := api.GetUser(context.Background(), GetUserRequestObject{UserId: test.userId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(GetUser200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if resp.Id == nil {
					t.Error("expected non-null id")
				} else if *resp.Id != *expectedUser.Id {
					t.Errorf("expected id: %d, actual id: %d", *expectedUser.Id, *resp.Id)
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
		userId           *int64
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

			api, usersDriver := getMockUsersApi(ctrl)
			expectedUser := &db.UserWithPasswordHash{
				User: models.User{
					Id:       test.userId,
					Username: test.username,
				},
			}
			ctx := context.Background()
			if test.userId != nil {
				ctx = context.WithValue(ctx, currentUserIdCtxKey, *test.userId)
			}
			if test.expectedError != nil {
				usersDriver.EXPECT().Read(gomock.Any()).Return(nil, test.expectedError)
			} else if test.userId != nil {
				usersDriver.EXPECT().Read(*test.userId).Return(expectedUser, nil)
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
					if resp.Id == nil {
						t.Error("expected non-null id")
					} else if *resp.Id != *expectedUser.Id {
						t.Errorf("expected id: %d, actual id: %d", *expectedUser.Id, *resp.Id)
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

			api, usersDriver := getMockUsersApi(ctrl)
			if test.expectedError != nil {
				usersDriver.EXPECT().List().Return(&test.users, test.expectedError)
			} else {
				usersDriver.EXPECT().List().Return(&test.users, nil)
			}

			// Act
			resp, err := api.GetAllUsers(context.Background(), GetAllUsersRequestObject{})

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

			api, usersDriver := getMockUsersApi(ctrl)
			expectedUser := models.User{
				Username:    test.username,
				AccessLevel: test.accessLevel,
			}
			if test.expectedError != nil {
				usersDriver.EXPECT().Create(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				usersDriver.EXPECT().Create(&expectedUser, test.password).Return(nil)
			}

			// Act
			resp, err := api.AddUser(context.Background(), AddUserRequestObject{Body: &UserWithPassword{User: expectedUser, Password: test.password}})

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
		currentUserId    int64
		requestUserId    int64
		user             models.User
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, 1, models.User{Id: utils.GetPtr[int64](1), Username: "user1", AccessLevel: models.Admin}, nil, nil, reflect.TypeOf(SaveUser204Response{})},
		{1, 1, models.User{Id: nil, Username: "user1", AccessLevel: models.Admin}, nil, nil, reflect.TypeOf(SaveUser204Response{})},

		{1, 1, models.User{Id: utils.GetPtr[int64](1), Username: "user1", AccessLevel: models.Editor}, nil, nil, reflect.TypeOf(SaveUser403Response{})},
		{1, 1, models.User{Id: nil, Username: "user1", AccessLevel: models.Editor}, nil, nil, reflect.TypeOf(SaveUser403Response{})},

		{1, 2, models.User{Id: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Editor}, nil, nil, reflect.TypeOf(SaveUser204Response{})},
		{1, 2, models.User{Id: nil, Username: "user2", AccessLevel: models.Editor}, nil, nil, reflect.TypeOf(SaveUser204Response{})},

		{1, 2, models.User{Id: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Viewer}, db.ErrNotFound, db.ErrNotFound, nil},

		{1, 3, models.User{Id: utils.GetPtr[int64](2), Username: "user2", AccessLevel: models.Viewer}, nil, errMismatchedId, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.currentUserId)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().Update(gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().Update(&test.user).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveUser(ctx, SaveUserRequestObject{UserId: test.requestUserId, Body: &test.user})

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
		currentUserId    int64
		userId           int64
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

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.currentUserId)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().Delete(gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().Delete(test.userId).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.DeleteUser(ctx, DeleteUserRequestObject{UserId: test.userId})

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
		currentUserId    int64
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

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.currentUserId)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().UpdatePassword(gomock.Any(), gomock.Any(), gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().UpdatePassword(test.currentUserId, test.request.CurrentPassword, test.request.NewPassword).Return(nil)
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
		currentUserId    int64
		userId           int64
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

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.currentUserId)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().UpdatePassword(gomock.Any(), gomock.Any(), gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().UpdatePassword(test.userId, test.request.CurrentPassword, test.request.NewPassword).Return(nil)
			}

			// Act
			resp, err := api.ChangeUserPassword(ctx, ChangeUserPasswordRequestObject{UserId: test.userId, Body: &test.request})

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

func Test_GetUserSettings(t *testing.T) {
	type testArgs struct {
		userId        int64
		homeTitle     string
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "My home", nil},
		{2, "It's mine", nil},
		{3, "", db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			expectedSettings := &models.UserSettings{
				UserId:    &test.userId,
				HomeTitle: &test.homeTitle,
			}
			if test.expectedError != nil {
				usersDriver.EXPECT().ReadSettings(gomock.Any()).Return(nil, test.expectedError)
			} else {
				usersDriver.EXPECT().ReadSettings(test.userId).Return(expectedSettings, nil)
			}

			// Act
			resp, err := api.GetUserSettings(context.Background(), GetUserSettingsRequestObject{UserId: test.userId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(GetUserSettings200JSONResponse)
				if !ok {
					t.Error("nvalid response")
				}
				if resp.UserId == nil {
					t.Error("expected non-null id")
				} else if *resp.UserId != *expectedSettings.UserId {
					t.Errorf("expected id: %d, actual id: %d", *expectedSettings.UserId, *resp.UserId)
				}
				if resp.HomeTitle == nil {
					t.Error("expected non-null title")
				} else if resp.HomeTitle != expectedSettings.HomeTitle {
					t.Errorf("expected title %s, actual title: %s", *expectedSettings.HomeTitle, *resp.HomeTitle)
				}
			}
		})
	}
}

func Test_GetSettings(t *testing.T) {
	type testArgs struct {
		userId        int64
		homeTitle     string
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "My home", nil},
		{2, "It's mine", nil},
		{3, "", db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			expectedSettings := &models.UserSettings{
				UserId:    &test.userId,
				HomeTitle: &test.homeTitle,
			}
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.userId)
			if test.expectedError != nil {
				usersDriver.EXPECT().ReadSettings(gomock.Any()).Return(nil, test.expectedError)
			} else {
				usersDriver.EXPECT().ReadSettings(test.userId).Return(expectedSettings, nil)
			}

			// Act
			resp, err := api.GetSettings(ctx, GetSettingsRequestObject{})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(GetSettings200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if resp.UserId == nil {
					t.Error("expected non-null id")
				} else if *resp.UserId != *expectedSettings.UserId {
					t.Errorf("expected id: %d, actual id: %d", *expectedSettings.UserId, *resp.UserId)
				}
				if resp.HomeTitle == nil {
					t.Error("expected non-null title")
				} else if resp.HomeTitle != expectedSettings.HomeTitle {
					t.Errorf("expected title %s, actual title: %s", *expectedSettings.HomeTitle, *resp.HomeTitle)
				}
			}
		})
	}
}

func Test_SaveSettings(t *testing.T) {
	type testArgs struct {
		currentUserId    int64
		userSettings     models.UserSettings
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, models.UserSettings{UserId: utils.GetPtr[int64](1), HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, nil, nil, reflect.TypeOf(SaveSettings204Response{})},
		{1, models.UserSettings{UserId: nil, HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, nil, nil, reflect.TypeOf(SaveSettings204Response{})},
		{2, models.UserSettings{UserId: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, db.ErrNotFound, db.ErrNotFound, nil},
		{1, models.UserSettings{UserId: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, nil, errMismatchedId, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.currentUserId)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().UpdateSettings(gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().UpdateSettings(&test.userSettings).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveSettings(ctx, SaveSettingsRequestObject{Body: &test.userSettings})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error '%v'", test.expectedError, err)
			} else if err == nil {
				if reflect.TypeOf(resp) != test.expectedResponse {
					t.Errorf("expected response: %v, actual response: %v", test.expectedResponse, reflect.TypeOf(resp))
				}
			}
		})
	}
}

func Test_SaveUserSettings(t *testing.T) {
	type testArgs struct {
		currentUserId    int64
		requestUserId    int64
		userSettings     models.UserSettings
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, 1, models.UserSettings{UserId: utils.GetPtr[int64](1), HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, nil, nil, reflect.TypeOf(SaveUserSettings204Response{})},
		{1, 1, models.UserSettings{UserId: nil, HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, nil, nil, reflect.TypeOf(SaveUserSettings204Response{})},

		{1, 2, models.UserSettings{UserId: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, nil, nil, reflect.TypeOf(SaveUserSettings204Response{})},
		{1, 2, models.UserSettings{UserId: nil, HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, nil, nil, reflect.TypeOf(SaveUserSettings204Response{})},

		{1, 2, models.UserSettings{UserId: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, db.ErrNotFound, db.ErrNotFound, nil},

		{1, 3, models.UserSettings{UserId: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Title"), HomeImageUrl: utils.GetPtr("My Url"), FavoriteTags: []string{"A", "B"}}, nil, errMismatchedId, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.currentUserId)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().UpdateSettings(gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().UpdateSettings(&test.userSettings).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveUserSettings(ctx, SaveUserSettingsRequestObject{UserId: test.requestUserId, Body: &test.userSettings})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error '%v'", test.expectedError, err)
			} else if err == nil {
				if reflect.TypeOf(resp) != test.expectedResponse {
					t.Errorf("expected response: %v, actual response: %v", test.expectedResponse, reflect.TypeOf(resp))
				}
			}
		})
	}
}

func Test_GetUserSearchFilters(t *testing.T) {
	type testArgs struct {
		userId        int64
		filters       []models.SavedSearchFilterCompact
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{
			1,
			[]models.SavedSearchFilterCompact{
				{Name: "Filter 1"},
				{Name: "Filter 2"},
			},
			nil,
		},
		{2, []models.SavedSearchFilterCompact{}, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.userId)
			if test.expectedError != nil {
				usersDriver.EXPECT().ListSearchFilters(gomock.Any()).Return(nil, test.expectedError)
			} else {
				usersDriver.EXPECT().ListSearchFilters(test.userId).Return(&test.filters, nil)
			}

			// Act
			resp, err := api.GetSearchFilters(ctx, GetSearchFiltersRequestObject{})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				typedResp, ok := resp.(GetSearchFilters200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if len(typedResp) != len(test.filters) {
					t.Errorf("expected length: %d, actual length: %d", len(test.filters), len(typedResp))
				}
			}
		})
	}
}

func Test_GetSearchFilters(t *testing.T) {
	type testArgs struct {
		userId        int64
		filters       []models.SavedSearchFilterCompact
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{
			1,
			[]models.SavedSearchFilterCompact{
				{Name: "Filter 1"},
				{Name: "Filter 2"},
			},
			nil,
		},
		{2, []models.SavedSearchFilterCompact{}, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			if test.expectedError != nil {
				usersDriver.EXPECT().ListSearchFilters(gomock.Any()).Return(nil, test.expectedError)
			} else {
				usersDriver.EXPECT().ListSearchFilters(test.userId).Return(&test.filters, nil)
			}

			// Act
			resp, err := api.GetUserSearchFilters(context.Background(), GetUserSearchFiltersRequestObject{UserId: test.userId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				typedResp, ok := resp.(GetUserSearchFilters200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if len(typedResp) != len(test.filters) {
					t.Errorf("expected length: %d, actual length: %d", len(test.filters), len(typedResp))
				}
			}
		})
	}
}

func Test_GetUserSearchFilter(t *testing.T) {
	type testArgs struct {
		userId        int64
		filterId      int64
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 1, nil},
		{1, 2, nil},
		{2, 3, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			if test.expectedError != nil {
				usersDriver.EXPECT().ReadSearchFilter(gomock.Any(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				usersDriver.EXPECT().ReadSearchFilter(test.userId, test.filterId).Return(&models.SavedSearchFilter{}, nil)
			}

			// Act
			resp, err := api.GetUserSearchFilter(context.Background(), GetUserSearchFilterRequestObject{UserId: test.userId, FilterId: test.filterId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(GetUserSearchFilter200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_GetSearchFilter(t *testing.T) {
	type testArgs struct {
		userId        int64
		filterId      int64
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 1, nil},
		{1, 2, nil},
		{2, 3, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.userId)
			if test.expectedError != nil {
				usersDriver.EXPECT().ReadSearchFilter(gomock.Any(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				usersDriver.EXPECT().ReadSearchFilter(test.userId, test.filterId).Return(&models.SavedSearchFilter{}, nil)
			}

			// Act
			resp, err := api.GetSearchFilter(ctx, GetSearchFilterRequestObject{FilterId: test.filterId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(GetSearchFilter200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_AddUserSearchFilter(t *testing.T) {
	type testArgs struct {
		userId          int64
		filter          models.SavedSearchFilter
		expectedDbError error
		expectedError   error
	}

	// Arrange
	tests := []testArgs{
		{
			1,
			models.SavedSearchFilter{},
			nil,
			nil,
		},
		{
			1,
			models.SavedSearchFilter{},
			db.ErrMissingId,
			db.ErrMissingId,
		},
		{
			1,
			models.SavedSearchFilter{
				UserId: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedId,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().CreateSearchFilter(gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().CreateSearchFilter(&test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.AddUserSearchFilter(context.Background(), AddUserSearchFilterRequestObject{UserId: test.userId, Body: &test.filter})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf(" expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(AddUserSearchFilter201JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_AddSearchFilter(t *testing.T) {
	type testArgs struct {
		userId          int64
		filter          models.SavedSearchFilter
		expectedDbError error
		expectedError   error
	}

	// Arrange
	tests := []testArgs{
		{
			1,
			models.SavedSearchFilter{},
			nil,
			nil,
		},
		{
			1,
			models.SavedSearchFilter{},
			db.ErrMissingId,
			db.ErrMissingId,
		},
		{
			1,
			models.SavedSearchFilter{
				UserId: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedId,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.userId)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().CreateSearchFilter(gomock.Any()).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().CreateSearchFilter(&test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.AddSearchFilter(ctx, AddSearchFilterRequestObject{Body: &test.filter})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf(" expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(AddSearchFilter201JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_SaveUserSearchFilter(t *testing.T) {
	type testArgs struct {
		userId          int64
		filterId        int64
		filter          models.SavedSearchFilter
		expectedDbError error
		expectedError   error
	}

	// Arrange
	tests := []testArgs{
		{
			1,
			1,
			models.SavedSearchFilter{},
			nil,
			nil,
		},
		{
			1,
			1,
			models.SavedSearchFilter{},
			db.ErrMissingId,
			db.ErrMissingId,
		},
		{
			1,
			1,
			models.SavedSearchFilter{
				UserId: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedId,
		},
		{
			1,
			1,
			models.SavedSearchFilter{
				Id: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedId,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().ReadSearchFilter(gomock.Any(), gomock.Any()).Return(nil, test.expectedDbError)
				usersDriver.EXPECT().UpdateSearchFilter(gomock.Any()).Times(0).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().ReadSearchFilter(gomock.Any(), gomock.Any()).MaxTimes(1).Return(&models.SavedSearchFilter{}, nil)
				usersDriver.EXPECT().UpdateSearchFilter(&test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveUserSearchFilter(context.Background(), SaveUserSearchFilterRequestObject{UserId: test.userId, FilterId: test.filterId, Body: &test.filter})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf(" expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(SaveUserSearchFilter204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_SaveSearchFilter(t *testing.T) {
	type testArgs struct {
		userId          int64
		filterId        int64
		filter          models.SavedSearchFilter
		expectedDbError error
		expectedError   error
	}

	// Arrange
	tests := []testArgs{
		{
			1,
			1,
			models.SavedSearchFilter{},
			nil,
			nil,
		},
		{
			1,
			1,
			models.SavedSearchFilter{},
			db.ErrMissingId,
			db.ErrMissingId,
		},
		{
			1,
			1,
			models.SavedSearchFilter{
				UserId: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedId,
		},
		{
			1,
			1,
			models.SavedSearchFilter{
				Id: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedId,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.userId)
			if test.expectedDbError != nil {
				usersDriver.EXPECT().ReadSearchFilter(gomock.Any(), gomock.Any()).Return(nil, test.expectedDbError)
				usersDriver.EXPECT().UpdateSearchFilter(gomock.Any()).Times(0).Return(test.expectedDbError)
			} else {
				usersDriver.EXPECT().ReadSearchFilter(gomock.Any(), gomock.Any()).MaxTimes(1).Return(&models.SavedSearchFilter{}, nil)
				usersDriver.EXPECT().UpdateSearchFilter(&test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveSearchFilter(ctx, SaveSearchFilterRequestObject{Body: &test.filter})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf(" expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(SaveSearchFilter204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_DeleteUserSearchFilter(t *testing.T) {
	type testArgs struct {
		userId        int64
		filterId      int64
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 1, nil},
		{1, 2, nil},
		{2, 3, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			if test.expectedError != nil {
				usersDriver.EXPECT().DeleteSearchFilter(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				usersDriver.EXPECT().DeleteSearchFilter(test.userId, test.filterId).Return(nil)
			}

			// Act
			resp, err := api.DeleteUserSearchFilter(context.Background(), DeleteUserSearchFilterRequestObject{UserId: test.userId, FilterId: test.filterId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(DeleteUserSearchFilter204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_DeleteSearchFilter(t *testing.T) {
	type testArgs struct {
		userId        int64
		filterId      int64
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 1, nil},
		{1, 2, nil},
		{2, 3, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.userId)
			if test.expectedError != nil {
				usersDriver.EXPECT().DeleteSearchFilter(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				usersDriver.EXPECT().DeleteSearchFilter(test.userId, test.filterId).Return(nil)
			}

			// Act
			resp, err := api.DeleteSearchFilter(ctx, DeleteSearchFilterRequestObject{FilterId: test.filterId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(DeleteSearchFilter204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func getMockUsersApi(ctrl *gomock.Controller) (apiHandler, *dbmock.MockUserDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	userDriver := dbmock.NewMockUserDriver(ctrl)
	dbDriver.EXPECT().Users().AnyTimes().Return(userDriver)
	uplDriver := uploadmock.NewMockDriver(ctrl)
	imgCfg := models.ImageConfiguration{
		ImageQuality:     models.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: models.ImageQualityMedium,
		ThumbnailSize:    500,
	}

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		upl:        upload.CreateImageUploader(uplDriver, imgCfg),
		db:         dbDriver,
	}
	return api, userDriver
}
