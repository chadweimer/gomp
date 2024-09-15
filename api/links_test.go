package api

import (
	"context"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/golang/mock/gomock"
)

func Test_GetLinks(t *testing.T) {
	type getLinksTest struct {
		recipeID    int64
		links       []models.RecipeCompact
		expectError bool
	}

	tests := []getLinksTest{
		{
			1,
			[]models.RecipeCompact{
				{Name: "Recipe 1"},
				{Name: "Recipe 2"},
			},
			false,
		},
		{2, []models.RecipeCompact{}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, linkDriver := getMockLinkAPI(ctrl)
			if test.expectError {
				linkDriver.EXPECT().List(test.recipeID).Return(nil, db.ErrNotFound)
			} else {
				linkDriver.EXPECT().List(test.recipeID).Return(&test.links, nil)
			}

			// Act
			resp, err := api.GetLinks(context.Background(), GetLinksRequestObject{RecipeID: test.recipeID})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("received error %v", err)
			} else if err == nil {
				typedResp, ok := resp.(GetLinks200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if len(typedResp) != len(test.links) {
					t.Errorf("expected length: %d, actual length: %d", len(test.links), len(typedResp))
				}
			}
		})
	}
}

func Test_AddLink(t *testing.T) {
	type addLinkTest struct {
		recipeID     int64
		destRecipeID int64
		expectError  bool
	}

	tests := []addLinkTest{
		{1, 2, false},
		{4, 7, false},
		{3, 1, false},
		{2, 9, false},
		{8, 2, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, linkDriver := getMockLinkAPI(ctrl)
			if test.expectError {
				linkDriver.EXPECT().Create(gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				linkDriver.EXPECT().Create(test.recipeID, test.destRecipeID).Return(nil)
			}

			// Act
			resp, err := api.AddLink(context.Background(), AddLinkRequestObject{RecipeID: test.recipeID, DestRecipeID: test.destRecipeID})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("received error %v", err)
			} else if err == nil {
				_, ok := resp.(AddLink204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_DeleteLink(t *testing.T) {
	type deleteLinkTest struct {
		recipeID     int64
		destRecipeID int64
		expectError  bool
	}

	tests := []deleteLinkTest{
		{1, 2, false},
		{4, 7, false},
		{3, 1, false},
		{2, 9, false},
		{8, 2, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, linkDriver := getMockLinkAPI(ctrl)
			if test.expectError {
				linkDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				linkDriver.EXPECT().Delete(test.recipeID, test.destRecipeID).Return(nil)
			}

			// Act
			resp, err := api.DeleteLink(context.Background(), DeleteLinkRequestObject{RecipeID: test.recipeID, DestRecipeID: test.destRecipeID})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("received error %v", err)
			} else if err == nil {
				_, ok := resp.(DeleteLink204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func getMockLinkAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockLinkDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	linkDriver := dbmock.NewMockLinkDriver(ctrl)
	dbDriver.EXPECT().Links().AnyTimes().Return(linkDriver)
	uplDriver := uploadmock.NewMockDriver(ctrl)
	imgCfg := models.ImageConfiguration{
		ImageQuality:     models.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: models.ImageQualityMedium,
		ThumbnailSize:    500,
	}

	api := apiHandler{
		secureKeys: []string{},
		upl:        upload.CreateImageUploader(uplDriver, imgCfg),
		db:         dbDriver,
	}
	return api, linkDriver
}
