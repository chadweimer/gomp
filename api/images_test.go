package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image/color"
	"io"
	"io/fs"
	"mime/multipart"
	"testing"
	"testing/fstest"
	"time"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/chadweimer/gomp/utils"
	"github.com/disintegration/imaging"
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

			api, imagesDriver, _ := getMockImagesApi(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().List(gomock.Any()).Return(nil, test.expectedError)
			} else {
				imagesDriver.EXPECT().List(test.recipeId).Return(&test.images, nil)
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

			api, imagesDriver, _ := getMockImagesApi(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().ReadMainImage(gomock.Any()).Return(nil, test.expectedError)
			} else {
				imagesDriver.EXPECT().ReadMainImage(test.recipeId).Return(test.image, nil)
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

			api, imagesDriver, _ := getMockImagesApi(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().UpdateMainImage(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				imagesDriver.EXPECT().UpdateMainImage(test.recipeId, test.imageId).Return(nil)
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

func Test_UploadImage(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, nil},
		{2, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, uplDriver := getMockImagesApi(ctrl)
			if test.expectedError != nil {
				uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).AnyTimes().Return(nil)
				imagesDriver.EXPECT().Create(gomock.Any()).Return(nil)
			}
			buf := bytes.NewBuffer([]byte{})
			writer := multipart.NewWriter(buf)
			part, err := writer.CreateFormFile("fileupload", "img.jpeg")
			imaging.Encode(part, imaging.New(1, 1, color.Black), imaging.JPEG)
			writer.Close()

			// Act
			resp, err := api.UploadImage(context.Background(), UploadImageRequestObject{RecipeId: test.recipeId, Body: multipart.NewReader(buf, writer.Boundary())})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				_, ok := resp.(UploadImage201JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func Test_DeleteImage(t *testing.T) {
	type testArgs struct {
		recipeId               int64
		imageId                int64
		imageName              string
		expectedReadError      error
		expectedDeleteError    error
		expectedUplDeleteError error
		expectedError          error
	}

	// Arrange
	tests := []testArgs{
		{1, 1, "img.jpeg", nil, nil, nil, nil},
		{2, 1, "img.jpeg", db.ErrNotFound, nil, nil, db.ErrNotFound},
		{1, 1, "img.jpeg", nil, io.ErrUnexpectedEOF, nil, io.ErrUnexpectedEOF},
		{1, 1, "img.jpeg", nil, nil, io.ErrClosedPipe, io.ErrClosedPipe},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, uplDriver := getMockImagesApi(ctrl)
			if test.expectedReadError != nil {
				imagesDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(nil, test.expectedReadError)
			} else {
				imagesDriver.EXPECT().Read(test.recipeId, test.imageId).Return(&models.RecipeImage{Id: &test.imageId, RecipeId: &test.recipeId, Name: &test.imageName}, nil)

				if test.expectedDeleteError != nil {
					imagesDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Return(test.expectedDeleteError)
				} else {
					imagesDriver.EXPECT().Delete(test.recipeId, test.imageId).Return(nil)

					if test.expectedUplDeleteError != nil {
						uplDriver.EXPECT().Delete(gomock.Any()).Return(test.expectedUplDeleteError)
					} else {
						// 2 times; once for original, once for thumbnail
						uplDriver.EXPECT().Delete(gomock.Any()).Times(2).Return(nil)
					}
				}
			}

			// Act
			resp, err := api.DeleteImage(context.Background(), DeleteImageRequestObject{RecipeId: test.recipeId, ImageId: test.imageId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				_, ok := resp.(DeleteImage204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func Test_OptimizeImage(t *testing.T) {
	type testArgs struct {
		recipeId          int64
		imageId           int64
		imageName         string
		expectedReadError error
		expectedLoadError error
		expectedSaveError error
		expectedError     error
	}

	// Arrange
	tests := []testArgs{
		{1, 1, "img.jpeg", nil, nil, nil, nil},
		{2, 1, "img.jpeg", db.ErrNotFound, nil, nil, db.ErrNotFound},
		{1, 1, "img.jpeg", nil, io.ErrUnexpectedEOF, nil, io.ErrUnexpectedEOF},
		{1, 1, "img.jpeg", nil, nil, io.ErrClosedPipe, io.ErrClosedPipe},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, uplDriver := getMockImagesApi(ctrl)
			if test.expectedReadError != nil {
				imagesDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(nil, test.expectedReadError)
			} else {
				imagesDriver.EXPECT().Read(test.recipeId, test.imageId).Return(&models.RecipeImage{Id: &test.imageId, RecipeId: &test.recipeId, Name: &test.imageName}, nil)

				if test.expectedLoadError != nil {
					uplDriver.EXPECT().Open(gomock.Any()).Return(nil, test.expectedLoadError)
				} else {
					buf := bytes.NewBuffer([]byte{})
					imaging.Encode(buf, imaging.New(1, 1, color.Black), imaging.JPEG)
					fs := fstest.MapFS{
						test.imageName: &fstest.MapFile{
							Data:    buf.Bytes(),
							Mode:    fs.ModeAppend,
							ModTime: time.Now(),
						},
					}
					uplDriver.EXPECT().Open(gomock.Any()).Return(fs.Open(test.imageName))

					if test.expectedSaveError != nil {
						uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Return(test.expectedSaveError)
					} else {
						// 2 times; once for original, once for thumbnail
						uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Times(2).Return(nil)
					}
				}
			}

			// Act
			resp, err := api.OptimizeImage(context.Background(), OptimizeImageRequestObject{RecipeId: test.recipeId, ImageId: test.imageId})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				_, ok := resp.(OptimizeImage204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func getMockImagesApi(ctrl *gomock.Controller) (apiHandler, *dbmock.MockRecipeImageDriver, *uploadmock.MockDriver) {
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
	return api, imagesDriver, uplDriver
}
