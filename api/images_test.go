package api

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/chadweimer/gomp/utils"
	"github.com/golang/mock/gomock"
)

func Test_GetImages(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		images        []models.RecipeImage
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, []models.RecipeImage{{Id: utils.GetPtr[int64](1), Name: utils.GetPtr("My Image")}}, nil},
		{2, nil, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver := getMockImagesApi(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().List(gomock.Any()).Return(nil, test.expectedError)
			} else {
				imagesDriver.EXPECT().List(test.recipeId).Return(&test.images, nil)
				imagesDriver.EXPECT().List(gomock.Any()).Times(0).Return(nil, db.ErrNotFound)
			}

			// Act
			resp, err := api.GetImages(context.Background(), GetImagesRequestObject{RecipeId: test.recipeId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				resp, ok := resp.(GetImages200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if len(resp) != len(test.images) {
					t.Errorf("test %v: expected length: %d, actual length: %d", test, len(test.images), len(resp))
				}
			}
		})
	}
}

func Test_GetMainImage(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		image         *models.RecipeImage
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, &models.RecipeImage{Id: utils.GetPtr[int64](1), Name: utils.GetPtr("My Image")}, nil},
		{2, nil, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver := getMockImagesApi(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().ReadMainImage(gomock.Any()).Return(nil, test.expectedError)
			} else {
				imagesDriver.EXPECT().ReadMainImage(test.recipeId).Return(test.image, nil)
				imagesDriver.EXPECT().ReadMainImage(gomock.Any()).Times(0).Return(nil, db.ErrNotFound)
			}

			// Act
			resp, err := api.GetMainImage(context.Background(), GetMainImageRequestObject{RecipeId: test.recipeId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				resp, ok := resp.(GetMainImage200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if test.expectedError == nil && *resp.Id != *test.image.Id {
					t.Errorf("ids don't match, expected: %d, received: %d", *test.image.Id, *resp.Id)
				}
			}
		})
	}
}

func Test_SetMainImage(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		imageId       int64
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 1, nil},
		{2, 1, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver := getMockImagesApi(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().UpdateMainImage(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				imagesDriver.EXPECT().UpdateMainImage(test.recipeId, test.imageId).Return(nil)
				imagesDriver.EXPECT().UpdateMainImage(gomock.Any(), gomock.Any()).Times(0).Return(db.ErrNotFound)
			}

			// Act
			resp, err := api.SetMainImage(context.Background(), SetMainImageRequestObject{RecipeId: test.recipeId, Body: &test.imageId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				_, ok := resp.(SetMainImage204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func getMockImagesApi(ctrl *gomock.Controller) (apiHandler, *dbmock.MockRecipeImageDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	imagesDriver := dbmock.NewMockRecipeImageDriver(ctrl)
	dbDriver.EXPECT().Images().AnyTimes().Return(imagesDriver)
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
	return api, imagesDriver
}
