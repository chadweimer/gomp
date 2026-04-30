package api

import (
	"database/sql"
	"errors"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
	"go.uber.org/mock/gomock"
)

func Test_GetLinks(t *testing.T) {
	type getLinksTest struct {
		name             string
		recipeID         int64
		links            []models.RecipeCompact
		dbError          error
		expectedError    error
		expectedResponse GetLinksResponseObject
	}

	tests := []getLinksTest{
		{
			name:     "Valid links",
			recipeID: 1,
			links: []models.RecipeCompact{
				{Name: "Recipe 1"},
				{Name: "Recipe 2"},
			},
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: GetLinks200JSONResponse{{Name: "Recipe 1"}, {Name: "Recipe 2"}},
		},
		{
			name:             "Recipe not found",
			recipeID:         2,
			links:            []models.RecipeCompact{},
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: GetLinks404Response{},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, linkDriver := getMockLinkAPI(ctrl)
			if test.dbError != nil {
				linkDriver.EXPECT().List(t.Context(), test.recipeID).Return(nil, test.dbError)
			} else {
				linkDriver.EXPECT().List(t.Context(), test.recipeID).Return(&test.links, nil)
			}

			// Act
			resp, err := api.GetLinks(t.Context(), GetLinksRequestObject{RecipeID: test.recipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch expected := test.expectedResponse.(type) {
				case GetLinks200JSONResponse:
					got, ok := resp.(GetLinks200JSONResponse)
					if !ok {
						t.Fatalf("expected GetLinks200JSONResponse, got %T", resp)
					}
					if len(got) != len(expected) {
						t.Errorf("expected length: %d, actual length: %d", len(expected), len(got))
					}
					missingLinks, unexpectedLinks := lo.Difference(got, expected)
					if len(missingLinks) > 0 {
						t.Errorf("missing links: %v", missingLinks)
					}
					if len(unexpectedLinks) > 0 {
						t.Errorf("unexpected links: %v", unexpectedLinks)
					}
				case GetLinks404Response:
					if _, ok := resp.(GetLinks404Response); !ok {
						t.Fatalf("expected GetLinks404Response, got %T", resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_AddLink(t *testing.T) {
	type addLinkTest struct {
		name             string
		recipeID         int64
		destRecipeID     int64
		dbError          error
		expectedError    error
		expectedResponse AddLinkResponseObject
	}

	tests := []addLinkTest{
		{
			name:             "Valid link",
			recipeID:         1,
			destRecipeID:     2,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: AddLink204Response{},
		},
		{
			name:             "Recipe not found",
			recipeID:         8,
			destRecipeID:     2,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: AddLink404Response{},
		},
		{
			name:             "DB Error",
			recipeID:         1,
			destRecipeID:     2,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, linkDriver := getMockLinkAPI(ctrl)
			if test.dbError != nil {
				linkDriver.EXPECT().Create(t.Context(), gomock.Any(), gomock.Any()).Return(test.dbError)
			} else {
				linkDriver.EXPECT().Create(t.Context(), test.recipeID, test.destRecipeID).Return(nil)
			}

			// Act
			resp, err := api.AddLink(t.Context(), AddLinkRequestObject{RecipeID: test.recipeID, DestRecipeID: test.destRecipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case AddLink204Response:
					if _, ok := resp.(AddLink204Response); !ok {
						t.Fatalf("expected AddLink204Response, got %T", resp)
					}
				case AddLink404Response:
					if _, ok := resp.(AddLink404Response); !ok {
						t.Fatalf("expected AddLink404Response, got %T", resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_DeleteLink(t *testing.T) {
	type deleteLinkTest struct {
		name             string
		recipeID         int64
		destRecipeID     int64
		dbError          error
		expectedError    error
		expectedResponse DeleteLinkResponseObject
	}

	tests := []deleteLinkTest{
		{
			name:             "Valid link",
			recipeID:         1,
			destRecipeID:     2,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: DeleteLink204Response{},
		},
		{
			name:             "Recipe not found",
			recipeID:         8,
			destRecipeID:     2,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: DeleteLink404Response{},
		},
		{
			name:             "DB Error",
			recipeID:         1,
			destRecipeID:     2,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, linkDriver := getMockLinkAPI(ctrl)
			if test.dbError != nil {
				linkDriver.EXPECT().Delete(t.Context(), gomock.Any(), gomock.Any()).Return(test.dbError)
			} else {
				linkDriver.EXPECT().Delete(t.Context(), test.recipeID, test.destRecipeID).Return(nil)
			}

			// Act
			resp, err := api.DeleteLink(t.Context(), DeleteLinkRequestObject{RecipeID: test.recipeID, DestRecipeID: test.destRecipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case DeleteLink204Response:
					if _, ok := resp.(DeleteLink204Response); !ok {
						t.Fatalf("expected DeleteLink204Response, got %T", resp)
					}
				case DeleteLink404Response:
					if _, ok := resp.(DeleteLink404Response); !ok {
						t.Fatalf("expected DeleteLink404Response, got %T", resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func getMockLinkAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockLinkDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	linkDriver := dbmock.NewMockLinkDriver(ctrl)
	dbDriver.EXPECT().Links().AnyTimes().Return(linkDriver)
	uplDriver := fileaccessmock.NewMockDriver(ctrl)
	imgCfg := fileaccess.ImageConfig{
		ImageQuality:     models.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: models.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := fileaccess.CreateImageUploader(uplDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{},
		upl:        upl,
		db:         dbDriver,
	}
	return api, linkDriver
}
