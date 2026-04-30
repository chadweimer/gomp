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

func Test_GetUserSearchFilters(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filters          []models.SavedSearchFilterCompact
		dbError          error
		expectedError    error
		expectedResponse GetUserSearchFiltersResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:   "Successfully get user search filters",
			userID: 1,
			filters: []models.SavedSearchFilterCompact{
				{Name: "Filter 1"},
				{Name: "Filter 2"},
			},
			dbError:       nil,
			expectedError: nil,
			expectedResponse: GetUserSearchFilters200JSONResponse{
				{Name: "Filter 1"},
				{Name: "Filter 2"},
			},
		},
		{
			name:             "User not found",
			userID:           2,
			filters:          []models.SavedSearchFilterCompact{},
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: GetUserSearchFilters404Response{},
		},
		{
			name:             "DB error",
			userID:           3,
			filters:          []models.SavedSearchFilterCompact{},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().List(t.Context(), gomock.Any()).Return(nil, test.dbError)
			} else {
				userSearchFiltersDriver.EXPECT().List(t.Context(), test.userID).Return(&test.filters, nil)
			}

			// Act
			resp, err := api.GetUserSearchFilters(t.Context(), GetUserSearchFiltersRequestObject{UserID: test.userID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case GetUserSearchFilters404Response:
					if _, ok := resp.(GetUserSearchFilters404Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case GetUserSearchFilters200JSONResponse:
					got, ok := resp.(GetUserSearchFilters200JSONResponse)
					if !ok {
						t.Fatalf("expected response type GetUserSearchFilters200JSONResponse, got %T", resp)
					}
					if len(got) != len(test.filters) {
						t.Errorf("expected length: %d, actual length: %d", len(test.filters), len(got))
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_GetSearchFilters(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filters          []models.SavedSearchFilterCompact
		dbError          error
		expectedError    error
		expectedResponse GetSearchFiltersResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:   "Successfully get user search filters",
			userID: 1,
			filters: []models.SavedSearchFilterCompact{
				{Name: "Filter 1"},
				{Name: "Filter 2"},
			},
			dbError:       nil,
			expectedError: nil,
			expectedResponse: GetSearchFilters200JSONResponse{
				{Name: "Filter 1"},
				{Name: "Filter 2"},
			},
		},
		{
			name:             "DB error",
			userID:           3,
			filters:          []models.SavedSearchFilterCompact{},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
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
				switch test.expectedResponse.(type) {
				case GetSearchFilters200JSONResponse:
					got, ok := resp.(GetSearchFilters200JSONResponse)
					if !ok {
						t.Fatalf("expected response type GetSearchFilters200JSONResponse, got %T", resp)
					}
					if len(got) != len(test.filters) {
						t.Errorf("expected length: %d, actual length: %d", len(test.filters), len(got))
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_GetUserSearchFilter(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filterID         int64
		dbError          error
		expectedError    error
		expectedResponse GetUserSearchFilterResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Successfully get user search filter",
			userID:           1,
			filterID:         1,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: GetUserSearchFilter200JSONResponse{},
		},
		{
			name:             "User or search filter not found",
			userID:           2,
			filterID:         2,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: GetUserSearchFilter404Response{},
		},
		{
			name:             "DB error",
			userID:           3,
			filterID:         3,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().Read(t.Context(), gomock.Any(), gomock.Any()).Return(nil, test.dbError)
			} else {
				userSearchFiltersDriver.EXPECT().Read(t.Context(), test.userID, test.filterID).Return(&models.SavedSearchFilter{}, nil)
			}

			// Act
			resp, err := api.GetUserSearchFilter(t.Context(), GetUserSearchFilterRequestObject{UserID: test.userID, FilterID: test.filterID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case GetUserSearchFilter404Response:
					if _, ok := resp.(GetUserSearchFilter404Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case GetUserSearchFilter200JSONResponse:
					if _, ok := resp.(GetUserSearchFilter200JSONResponse); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_GetSearchFilter(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filterID         int64
		dbError          error
		expectedError    error
		expectedResponse GetSearchFilterResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Successfully get user search filter",
			userID:           1,
			filterID:         1,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: GetSearchFilter200JSONResponse{},
		},
		{
			name:             "Search filter not found",
			userID:           2,
			filterID:         2,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: GetSearchFilter404Response{},
		},
		{
			name:             "DB error",
			userID:           3,
			filterID:         3,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().Read(ctx, gomock.Any(), gomock.Any()).Return(nil, test.dbError)
			} else {
				userSearchFiltersDriver.EXPECT().Read(ctx, test.userID, test.filterID).Return(&models.SavedSearchFilter{}, nil)
			}

			// Act
			resp, err := api.GetSearchFilter(ctx, GetSearchFilterRequestObject{FilterID: test.filterID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case GetSearchFilter404Response:
					if _, ok := resp.(GetSearchFilter404Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case GetSearchFilter200JSONResponse:
					if _, ok := resp.(GetSearchFilter200JSONResponse); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_AddUserSearchFilter(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filter           models.SavedSearchFilter
		dbError          error
		expectedError    error
		expectedResponse AddUserSearchFilterResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Successfully add user search filter",
			userID:           1,
			filter:           models.SavedSearchFilter{},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: AddUserSearchFilter201JSONResponse{},
		},
		{
			name:             "User not found",
			userID:           2,
			filter:           models.SavedSearchFilter{},
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: AddUserSearchFilter404Response{},
		},
		{
			name:             "DB error",
			userID:           1,
			filter:           models.SavedSearchFilter{},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
		{
			name:             "Mismatched user ID",
			userID:           1,
			filter:           models.SavedSearchFilter{UserID: utils.GetPtr(int64(2))},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: AddUserSearchFilter400Response{},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().Create(t.Context(), gomock.Any()).Return(test.dbError)
			} else {
				userSearchFiltersDriver.EXPECT().Create(t.Context(), &test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.AddUserSearchFilter(t.Context(), AddUserSearchFilterRequestObject{UserID: test.userID, Body: &test.filter})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf(" expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case AddUserSearchFilter201JSONResponse:
					if _, ok := resp.(AddUserSearchFilter201JSONResponse); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case AddUserSearchFilter400Response:
					if _, ok := resp.(AddUserSearchFilter400Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case AddUserSearchFilter404Response:
					if _, ok := resp.(AddUserSearchFilter404Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_AddSearchFilter(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filter           models.SavedSearchFilter
		dbError          error
		expectedError    error
		expectedResponse AddSearchFilterResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Successfully add user search filter",
			userID:           1,
			filter:           models.SavedSearchFilter{},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: AddSearchFilter201JSONResponse{},
		},
		{
			name:             "DB error",
			userID:           1,
			filter:           models.SavedSearchFilter{},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
		{
			name:             "Mismatched user ID",
			userID:           1,
			filter:           models.SavedSearchFilter{UserID: utils.GetPtr(int64(2))},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: AddSearchFilter400Response{},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().Create(ctx, gomock.Any()).Return(test.dbError)
			} else {
				userSearchFiltersDriver.EXPECT().Create(ctx, &test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.AddSearchFilter(ctx, AddSearchFilterRequestObject{Body: &test.filter})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf(" expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case AddSearchFilter201JSONResponse:
					if _, ok := resp.(AddSearchFilter201JSONResponse); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case AddSearchFilter400Response:
					if _, ok := resp.(AddSearchFilter400Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_SaveUserSearchFilter(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filterID         int64
		filter           models.SavedSearchFilter
		dbError          error
		expectedError    error
		expectedResponse SaveUserSearchFilterResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Successfully save user search filter",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUserSearchFilter204Response{},
		},
		{
			name:             "Missing ID",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{},
			dbError:          db.ErrMissingID,
			expectedError:    db.ErrMissingID,
			expectedResponse: nil,
		},
		{
			name:             "Mismatched user ID",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{UserID: utils.GetPtr(int64(2))},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUserSearchFilter400Response{},
		},
		{
			name:             "Mismatched filter ID",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{ID: utils.GetPtr(int64(2))},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveUserSearchFilter400Response{},
		},
		{
			name:             "DB error",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().Read(t.Context(), gomock.Any(), gomock.Any()).Return(nil, test.dbError)
				userSearchFiltersDriver.EXPECT().Update(t.Context(), gomock.Any()).Times(0).Return(test.dbError)
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
				switch test.expectedResponse.(type) {
				case SaveUserSearchFilter204Response:
					if _, ok := resp.(SaveUserSearchFilter204Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case SaveUserSearchFilter400Response:
					if _, ok := resp.(SaveUserSearchFilter400Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case SaveUserSearchFilter404Response:
					if _, ok := resp.(SaveUserSearchFilter404Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_SaveSearchFilter(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filterID         int64
		filter           models.SavedSearchFilter
		dbError          error
		expectedError    error
		expectedResponse SaveSearchFilterResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Successfully save user search filter",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveSearchFilter204Response{},
		},
		{
			name:             "Missing ID",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{},
			dbError:          db.ErrMissingID,
			expectedError:    db.ErrMissingID,
			expectedResponse: nil,
		},
		{
			name:             "Mismatched user ID",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{UserID: utils.GetPtr(int64(2))},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveSearchFilter400Response{},
		},
		{
			name:             "Mismatched filter ID",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{ID: utils.GetPtr(int64(2))},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveSearchFilter400Response{},
		},
		{
			name:             "DB error",
			userID:           1,
			filterID:         1,
			filter:           models.SavedSearchFilter{},
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().Read(ctx, gomock.Any(), gomock.Any()).Return(nil, test.dbError)
				userSearchFiltersDriver.EXPECT().Update(ctx, gomock.Any()).Times(0).Return(test.dbError)
			} else {
				userSearchFiltersDriver.EXPECT().Read(ctx, gomock.Any(), gomock.Any()).MaxTimes(1).Return(&models.SavedSearchFilter{}, nil)
				userSearchFiltersDriver.EXPECT().Update(ctx, &test.filter).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveSearchFilter(ctx, SaveSearchFilterRequestObject{FilterID: test.filterID, Body: &test.filter})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf(" expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case SaveSearchFilter204Response:
					if _, ok := resp.(SaveSearchFilter204Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case SaveSearchFilter400Response:
					if _, ok := resp.(SaveSearchFilter400Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case SaveSearchFilter404Response:
					if _, ok := resp.(SaveSearchFilter404Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_DeleteUserSearchFilter(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filterID         int64
		dbError          error
		expectedError    error
		expectedResponse DeleteUserSearchFilterResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Successfully delete user search filter",
			userID:           1,
			filterID:         1,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: DeleteUserSearchFilter204Response{},
		},
		{
			name:             "User or search filter not found",
			userID:           2,
			filterID:         2,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: DeleteUserSearchFilter404Response{},
		},
		{
			name:             "DB error",
			userID:           3,
			filterID:         3,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().Delete(t.Context(), gomock.Any(), gomock.Any()).Return(test.dbError)
			} else {
				userSearchFiltersDriver.EXPECT().Delete(t.Context(), test.userID, test.filterID).Return(nil)
			}

			// Act
			resp, err := api.DeleteUserSearchFilter(t.Context(), DeleteUserSearchFilterRequestObject{UserID: test.userID, FilterID: test.filterID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case DeleteUserSearchFilter404Response:
					if _, ok := resp.(DeleteUserSearchFilter404Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case DeleteUserSearchFilter204Response:
					if _, ok := resp.(DeleteUserSearchFilter204Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_DeleteSearchFilter(t *testing.T) {
	type testArgs struct {
		name             string
		userID           int64
		filterID         int64
		dbError          error
		expectedError    error
		expectedResponse DeleteSearchFilterResponseObject
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Successfully delete user search filter",
			userID:           1,
			filterID:         1,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: DeleteSearchFilter204Response{},
		},
		{
			name:             "User or search filter not found",
			userID:           2,
			filterID:         2,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: DeleteSearchFilter404Response{},
		},
		{
			name:             "DB error",
			userID:           3,
			filterID:         3,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userSearchFiltersDriver := getMockUserSearchFiltersAPI(ctrl)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, test.userID)
			if test.dbError != nil {
				userSearchFiltersDriver.EXPECT().Delete(ctx, gomock.Any(), gomock.Any()).Return(test.dbError)
			} else {
				userSearchFiltersDriver.EXPECT().Delete(ctx, test.userID, test.filterID).Return(nil)
			}

			// Act
			resp, err := api.DeleteSearchFilter(ctx, DeleteSearchFilterRequestObject{FilterID: test.filterID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case DeleteSearchFilter404Response:
					if _, ok := resp.(DeleteSearchFilter404Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				case DeleteSearchFilter204Response:
					if _, ok := resp.(DeleteSearchFilter204Response); !ok {
						t.Errorf("expected response type: %T, received response type: %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
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
