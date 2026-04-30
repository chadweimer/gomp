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

func Test_GetUserSettings(t *testing.T) {
	type testArgs struct {
		userID        int64
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

			api, userSettingsDriver := getMockUserSettingsAPI(ctrl)
			expectedSettings := &models.UserSettings{
				UserID:    &test.userID,
				HomeTitle: &test.homeTitle,
			}
			if test.expectedError != nil {
				userSettingsDriver.EXPECT().Read(t.Context(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				userSettingsDriver.EXPECT().Read(t.Context(), test.userID).Return(expectedSettings, nil)
			}

			// Act
			resp, err := api.GetUserSettings(t.Context(), GetUserSettingsRequestObject{UserID: test.userID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				got, ok := resp.(GetUserSettings200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if got.UserID == nil {
					t.Error("expected non-null id")
				} else if *got.UserID != *expectedSettings.UserID {
					t.Errorf("expected id: %d, actual id: %d", *expectedSettings.UserID, *got.UserID)
				}
				if got.HomeTitle == nil {
					t.Error("expected non-null title")
				} else if *got.HomeTitle != *expectedSettings.HomeTitle {
					t.Errorf("expected title %s, actual title: %s", *expectedSettings.HomeTitle, *got.HomeTitle)
				}
			}
		})
	}
}

func Test_GetSettings(t *testing.T) {
	type testArgs struct {
		userID        int64
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

			api, userSettingsDriver := getMockUserSettingsAPI(ctrl)
			expectedSettings := &models.UserSettings{
				UserID:    &test.userID,
				HomeTitle: &test.homeTitle,
			}
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.expectedError != nil {
				userSettingsDriver.EXPECT().Read(ctx, gomock.Any()).Return(nil, test.expectedError)
			} else {
				userSettingsDriver.EXPECT().Read(ctx, test.userID).Return(expectedSettings, nil)
			}

			// Act
			resp, err := api.GetSettings(ctx, GetSettingsRequestObject{})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				got, ok := resp.(GetSettings200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if got.UserID == nil {
					t.Error("expected non-null id")
				} else if *got.UserID != *expectedSettings.UserID {
					t.Errorf("expected id: %d, actual id: %d", *expectedSettings.UserID, *got.UserID)
				}
				if got.HomeTitle == nil {
					t.Error("expected non-null title")
				} else if *got.HomeTitle != *expectedSettings.HomeTitle {
					t.Errorf("expected title %s, actual title: %s", *expectedSettings.HomeTitle, *got.HomeTitle)
				}
			}
		})
	}
}

func Test_SaveSettings(t *testing.T) {
	type testArgs struct {
		currentUserID    int64
		userSettings     models.UserSettings
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, models.UserSettings{UserID: utils.GetPtr[int64](1), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, nil, nil, reflect.TypeOf(SaveSettings204Response{})},
		{1, models.UserSettings{UserID: nil, HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, nil, nil, reflect.TypeOf(SaveSettings204Response{})},
		{2, models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, db.ErrNotFound, db.ErrNotFound, nil},
		{1, models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, nil, errMismatchedID, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSettingsDriver := getMockUserSettingsAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.expectedDbError != nil {
				userSettingsDriver.EXPECT().Update(ctx, gomock.Any()).Return(test.expectedDbError)
			} else {
				userSettingsDriver.EXPECT().Update(ctx, &test.userSettings).MaxTimes(1).Return(nil)
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
		currentUserID    int64
		requestUserID    int64
		userSettings     models.UserSettings
		expectedDbError  error
		expectedError    error
		expectedResponse reflect.Type
	}

	// Arrange
	tests := []testArgs{
		{1, 1, models.UserSettings{UserID: utils.GetPtr[int64](1), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, nil, nil, reflect.TypeOf(SaveUserSettings204Response{})},
		{1, 1, models.UserSettings{UserID: nil, HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, nil, nil, reflect.TypeOf(SaveUserSettings204Response{})},

		{1, 2, models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, nil, nil, reflect.TypeOf(SaveUserSettings204Response{})},
		{1, 2, models.UserSettings{UserID: nil, HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, nil, nil, reflect.TypeOf(SaveUserSettings204Response{})},

		{1, 2, models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, db.ErrNotFound, db.ErrNotFound, nil},

		{1, 3, models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}}, nil, errMismatchedID, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSettingsDriver := getMockUserSettingsAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.expectedDbError != nil {
				userSettingsDriver.EXPECT().Update(ctx, gomock.Any()).Return(test.expectedDbError)
			} else {
				userSettingsDriver.EXPECT().Update(ctx, &test.userSettings).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveUserSettings(ctx, SaveUserSettingsRequestObject{UserID: test.requestUserID, Body: &test.userSettings})

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

func getMockUserSettingsAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockUserSettingsDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	userSettingsDriver := dbmock.NewMockUserSettingsDriver(ctrl)
	dbDriver.EXPECT().UserSettings().AnyTimes().Return(userSettingsDriver)
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
	return api, userSettingsDriver
}
