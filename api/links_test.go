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
		recipeId    int64
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

			api, linkDriver := getMockLinkApi(ctrl)
			if test.expectError {
				linkDriver.EXPECT().List(test.recipeId).Return(nil, db.ErrNotFound)
			} else {
				linkDriver.EXPECT().List(test.recipeId).Return(&test.links, nil)
			}

			// Act
			resp, err := api.GetLinks(context.Background(), GetLinksRequestObject{RecipeId: test.recipeId})

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
		recipeId     int64
		destRecipeId int64
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

			api, linkDriver := getMockLinkApi(ctrl)
			if test.expectError {
				linkDriver.EXPECT().Create(gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				linkDriver.EXPECT().Create(test.recipeId, test.destRecipeId).Return(nil)
			}

			// Act
			resp, err := api.AddLink(context.Background(), AddLinkRequestObject{RecipeId: test.recipeId, DestRecipeId: test.destRecipeId})

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
		recipeId     int64
		destRecipeId int64
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

			api, linkDriver := getMockLinkApi(ctrl)
			if test.expectError {
				linkDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				linkDriver.EXPECT().Delete(test.recipeId, test.destRecipeId).Return(nil)
			}

			// Act
			resp, err := api.DeleteLink(context.Background(), DeleteLinkRequestObject{RecipeId: test.recipeId, DestRecipeId: test.destRecipeId})

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

func getMockLinkApi(ctrl *gomock.Controller) (apiHandler, *dbmock.MockLinkDriver) {
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
