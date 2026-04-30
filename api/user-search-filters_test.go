package api

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"go.uber.org/mock/gomock"
)

func Test_GetUserSearchFilters(t *testing.T) {
	type testArgs struct {
		userID        int64
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

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.expectedError != nil {
				userSearchFiltersDriver.EXPECT().List(ctx, gomock.Any()).Return(nil, test.expectedError)
			} else {
				userSearchFiltersDriver.EXPECT().List(ctx, test.userID).Return(&test.filters, nil)
			}

			// Act
			resp, err := api.GetSearchFilters(ctx, GetSearchFiltersRequestObject{})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				got, ok := resp.(GetSearchFilters200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if len(got) != len(test.filters) {
					t.Errorf("expected length: %d, actual length: %d", len(test.filters), len(got))
				}
			}
		})
	}
}

func Test_GetSearchFilters(t *testing.T) {
	type testArgs struct {
		userID        int64
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

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.expectedError != nil {
				userSearchFiltersDriver.EXPECT().List(t.Context(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				userSearchFiltersDriver.EXPECT().List(t.Context(), test.userID).Return(&test.filters, nil)
			}

			// Act
			resp, err := api.GetUserSearchFilters(t.Context(), GetUserSearchFiltersRequestObject{UserID: test.userID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				got, ok := resp.(GetUserSearchFilters200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if len(got) != len(test.filters) {
					t.Errorf("expected length: %d, actual length: %d", len(test.filters), len(got))
				}
			}
		})
	}
}

func Test_GetUserSearchFilter(t *testing.T) {
	type testArgs struct {
		userID        int64
		filterID      int64
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

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.expectedError != nil {
				userSearchFiltersDriver.EXPECT().Read(t.Context(), gomock.Any(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				userSearchFiltersDriver.EXPECT().Read(t.Context(), test.userID, test.filterID).Return(&models.SavedSearchFilter{}, nil)
			}

			// Act
			resp, err := api.GetUserSearchFilter(t.Context(), GetUserSearchFilterRequestObject{UserID: test.userID, FilterID: test.filterID})

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
		userID        int64
		filterID      int64
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

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.expectedError != nil {
				userSearchFiltersDriver.EXPECT().Read(ctx, gomock.Any(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				userSearchFiltersDriver.EXPECT().Read(ctx, test.userID, test.filterID).Return(&models.SavedSearchFilter{}, nil)
			}

			// Act
			resp, err := api.GetSearchFilter(ctx, GetSearchFilterRequestObject{FilterID: test.filterID})

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
		userID          int64
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
			db.ErrMissingID,
			db.ErrMissingID,
		},
		{
			1,
			models.SavedSearchFilter{
				UserID: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedID,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.expectedDbError != nil {
				userSearchFiltersDriver.EXPECT().Create(t.Context(), gomock.Any()).Return(test.expectedDbError)
			} else {
				userSearchFiltersDriver.EXPECT().Create(t.Context(), &test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.AddUserSearchFilter(t.Context(), AddUserSearchFilterRequestObject{UserID: test.userID, Body: &test.filter})

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
		userID          int64
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
			db.ErrMissingID,
			db.ErrMissingID,
		},
		{
			1,
			models.SavedSearchFilter{
				UserID: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedID,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.expectedDbError != nil {
				userSearchFiltersDriver.EXPECT().Create(ctx, gomock.Any()).Return(test.expectedDbError)
			} else {
				userSearchFiltersDriver.EXPECT().Create(ctx, &test.filter).MaxTimes(1).Return(nil)
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
		userID          int64
		filterID        int64
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
			db.ErrMissingID,
			db.ErrMissingID,
		},
		{
			1,
			1,
			models.SavedSearchFilter{
				UserID: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedID,
		},
		{
			1,
			1,
			models.SavedSearchFilter{
				ID: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedID,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.expectedDbError != nil {
				userSearchFiltersDriver.EXPECT().Read(t.Context(), gomock.Any(), gomock.Any()).Return(nil, test.expectedDbError)
				userSearchFiltersDriver.EXPECT().Update(t.Context(), gomock.Any()).Times(0).Return(test.expectedDbError)
			} else {
				userSearchFiltersDriver.EXPECT().Read(t.Context(), gomock.Any(), gomock.Any()).MaxTimes(1).Return(&models.SavedSearchFilter{}, nil)
				userSearchFiltersDriver.EXPECT().Update(t.Context(), &test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveUserSearchFilter(t.Context(), SaveUserSearchFilterRequestObject{UserID: test.userID, FilterID: test.filterID, Body: &test.filter})

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
		userID          int64
		filterID        int64
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
			db.ErrMissingID,
			db.ErrMissingID,
		},
		{
			1,
			1,
			models.SavedSearchFilter{
				UserID: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedID,
		},
		{
			1,
			1,
			models.SavedSearchFilter{
				ID: utils.GetPtr(int64(2)),
			},
			nil,
			errMismatchedID,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.expectedDbError != nil {
				userSearchFiltersDriver.EXPECT().Read(ctx, gomock.Any(), gomock.Any()).Return(nil, test.expectedDbError)
				userSearchFiltersDriver.EXPECT().Update(ctx, gomock.Any()).Times(0).Return(test.expectedDbError)
			} else {
				userSearchFiltersDriver.EXPECT().Read(ctx, gomock.Any(), gomock.Any()).MaxTimes(1).Return(&models.SavedSearchFilter{}, nil)
				userSearchFiltersDriver.EXPECT().Update(ctx, &test.filter).MaxTimes(1).Return(nil)
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
		userID        int64
		filterID      int64
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

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.expectedError != nil {
				userSearchFiltersDriver.EXPECT().Delete(t.Context(), gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				userSearchFiltersDriver.EXPECT().Delete(t.Context(), test.userID, test.filterID).Return(nil)
			}

			// Act
			resp, err := api.DeleteUserSearchFilter(t.Context(), DeleteUserSearchFilterRequestObject{UserID: test.userID, FilterID: test.filterID})

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
		userID        int64
		filterID      int64
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

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.expectedError != nil {
				userSearchFiltersDriver.EXPECT().Delete(ctx, gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				userSearchFiltersDriver.EXPECT().Delete(ctx, test.userID, test.filterID).Return(nil)
			}

			// Act
			resp, err := api.DeleteSearchFilter(ctx, DeleteSearchFilterRequestObject{FilterID: test.filterID})

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

func getMockUserSearchFiltersAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockUserSearchFilterDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	userSearchFiltersDriver := dbmock.NewMockUserSearchFilterDriver(ctrl)
	dbDriver.EXPECT().UserSearchFilters().AnyTimes().Return(userSearchFiltersDriver)
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
	return api, userSearchFiltersDriver
}
