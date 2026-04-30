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

func Test_GetUserSettings(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		homeTitle        string
		dbError          error
		expectedError    error
		expectedResponse GetUserSettingsResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Success",
			userID:           1,
			homeTitle:        "My home",
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: GetUserSettings200JSONResponse{},
		},
		{
			name:             "Not found",
			userID:           3,
			homeTitle:        "",
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: GetUserSettings404Response{},
		},
		{
			name:             "DB error",
			userID:           4,
			homeTitle:        "",
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSettingsDriver := getMockUserSettingsAPI(ctrl)
			expectedSettings := &models.UserSettings{
				UserID:    &test.userID,
				HomeTitle: &test.homeTitle,
			}
			if test.dbError != nil {
				userSettingsDriver.EXPECT().Read(t.Context(), gomock.Any()).Return(nil, test.dbError)
			} else {
				userSettingsDriver.EXPECT().Read(t.Context(), test.userID).Return(expectedSettings, nil)
			}

			// Act
			resp, err := api.GetUserSettings(t.Context(), GetUserSettingsRequestObject{UserID: test.userID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case GetUserSettings200JSONResponse:
					got, ok := resp.(GetUserSettings200JSONResponse)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
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
				case GetUserSettings404Response:
					if _, ok := resp.(GetUserSettings404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", test.expectedResponse)
				}
			}
		})
	}
}

func Test_GetSettings(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		homeTitle        string
		dbError          error
		expectedError    error
		expectedResponse GetSettingsResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Success",
			userID:           1,
			homeTitle:        "My home",
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: GetSettings200JSONResponse{},
		},
		{
			name:             "DB error",
			userID:           4,
			homeTitle:        "",
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
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
				switch test.expectedResponse.(type) {
				case GetSettings200JSONResponse:
					got, ok := resp.(GetSettings200JSONResponse)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
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
				default:
					t.Errorf("unexpected response type: %T", test.expectedResponse)
				}
			}
		})
	}
}

func Test_SaveSettings(t *testing.T) {
	type testArgs struct {
		name             string
		currentUserID    int64
		userSettings     models.UserSettings
		dbError          error
		expectedError    error
		expectedResponse SaveSettingsResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Success with matching user ID",
			currentUserID:    1,
			userSettings:     models.UserSettings{UserID: utils.GetPtr[int64](1), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveSettings204Response{},
		},
		{
			name:             "Success with nil user ID",
			currentUserID:    1,
			userSettings:     models.UserSettings{UserID: nil, HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveSettings204Response{},
		},
		{
			name:             "Mismatched user ID",
			currentUserID:    1,
			userSettings:     models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveSettings400Response{},
		},
		{
			name:             "DB error",
			currentUserID:    1,
			userSettings:     models.UserSettings{UserID: utils.GetPtr[int64](1), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSettingsDriver := getMockUserSettingsAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.dbError != nil {
				userSettingsDriver.EXPECT().Update(ctx, gomock.Any()).Return(test.dbError)
			} else {
				userSettingsDriver.EXPECT().Update(ctx, &test.userSettings).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveSettings(ctx, SaveSettingsRequestObject{Body: &test.userSettings})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error '%v'", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case SaveSettings204Response:
					if _, ok := resp.(SaveSettings204Response); !ok {
						t.Fatalf("expected %t, got %T", test.expectedResponse, resp)
					}
				case SaveSettings400Response:
					if _, ok := resp.(SaveSettings400Response); !ok {
						t.Fatalf("expected %t, got %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", test.expectedResponse)
				}
			}
		})
	}
}

func Test_SaveUserSettings(t *testing.T) {
	type testArgs struct {
		name             string
		currentUserID    int64
		requestUserID    int64
		userSettings     models.UserSettings
		dbError          error
		expectedError    error
		expectedResponse SaveUserSettingsResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Success with matching user ID",
			currentUserID:    1,
			requestUserID:    1,
			userSettings:     models.UserSettings{UserID: utils.GetPtr[int64](1), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUserSettings204Response{},
		},
		{
			name:             "Success with nil user ID",
			currentUserID:    1,
			requestUserID:    1,
			userSettings:     models.UserSettings{UserID: nil, HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUserSettings204Response{},
		},
		{
			name:             "Success with different user ID",
			currentUserID:    1,
			requestUserID:    2,
			userSettings:     models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUserSettings204Response{},
		},
		{
			name:             "Success with nil user ID and different request ID",
			currentUserID:    1,
			requestUserID:    2,
			userSettings:     models.UserSettings{UserID: nil, HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUserSettings204Response{},
		},
		{
			name:             "Not found error",
			currentUserID:    1,
			requestUserID:    2,
			userSettings:     models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: SaveUserSettings404Response{},
		},
		{
			name:             "Mismatched ID error",
			currentUserID:    1,
			requestUserID:    3,
			userSettings:     models.UserSettings{UserID: utils.GetPtr[int64](2), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUserSettings400Response{},
		},
		{
			name:             "DB error",
			currentUserID:    1,
			requestUserID:    1,
			userSettings:     models.UserSettings{UserID: utils.GetPtr[int64](1), HomeTitle: utils.GetPtr("My Home Title"), HomeImageURL: utils.GetPtr("https://example.com/my-image.jpg"), FavoriteTags: []string{"quick", "kid-friendly"}},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSettingsDriver := getMockUserSettingsAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.currentUserID)
			if test.dbError != nil {
				userSettingsDriver.EXPECT().Update(ctx, gomock.Any()).Return(test.dbError)
			} else {
				userSettingsDriver.EXPECT().Update(ctx, &test.userSettings).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveUserSettings(ctx, SaveUserSettingsRequestObject{UserID: test.requestUserID, Body: &test.userSettings})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error '%v'", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case SaveUserSettings204Response:
					if _, ok := resp.(SaveUserSettings204Response); !ok {
						t.Fatalf("expected %t, got %T", test.expectedResponse, resp)
					}
				case SaveUserSettings404Response:
					if _, ok := resp.(SaveUserSettings404Response); !ok {
						t.Fatalf("expected %t, got %T", test.expectedResponse, resp)
					}
				case SaveUserSettings400Response:
					if _, ok := resp.(SaveUserSettings400Response); !ok {
						t.Fatalf("expected %t, got %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", test.expectedResponse)
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
