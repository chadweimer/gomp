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
	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"github.com/disintegration/imaging"
	"github.com/golang/mock/gomock"
)

func Test_GetImages(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		images        []models.RecipeImage
		expectedError error
	}

	tests := []testArgs{
		{1, []models.RecipeImage{{ID: utils.GetPtr[int64](1), Name: utils.GetPtr("My Image")}}, nil},
		{2, nil, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, _ := getMockImagesAPI(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().List(gomock.Any()).Return(nil, test.expectedError)
			} else {
				imagesDriver.EXPECT().List(test.recipeID).Return(&test.images, nil)
			}

			// Act
			resp, err := api.GetImages(context.Background(), GetImagesRequestObject{RecipeID: test.recipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected erro: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(GetImages200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if len(resp) != len(test.images) {
					t.Errorf("expected length: %d, actual length: %d", len(test.images), len(resp))
				}
			}
		})
	}
}

func Test_GetMainImage(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		image         *models.RecipeImage
		expectedError error
	}

	tests := []testArgs{
		{1, &models.RecipeImage{ID: utils.GetPtr[int64](1), Name: utils.GetPtr("My Image")}, nil},
		{2, nil, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, _ := getMockImagesAPI(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().ReadMainImage(gomock.Any()).Return(nil, test.expectedError)
			} else {
				imagesDriver.EXPECT().ReadMainImage(test.recipeID).Return(test.image, nil)
			}

			// Act
			resp, err := api.GetMainImage(context.Background(), GetMainImageRequestObject{RecipeID: test.recipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(GetMainImage200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if test.expectedError == nil && *resp.ID != *test.image.ID {
					t.Errorf("expected id: %d, received id: %d", *test.image.ID, *resp.ID)
				}
			}
		})
	}
}

func Test_SetMainImage(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		imageID       int64
		expectedError error
	}

	tests := []testArgs{
		{1, 1, nil},
		{2, 1, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, _ := getMockImagesAPI(ctrl)
			if test.expectedError != nil {
				imagesDriver.EXPECT().UpdateMainImage(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				imagesDriver.EXPECT().UpdateMainImage(test.recipeID, test.imageID).Return(nil)
			}

			// Act
			resp, err := api.SetMainImage(context.Background(), SetMainImageRequestObject{RecipeID: test.recipeID, Body: &test.imageID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(SetMainImage204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_UploadImage(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		expectedError error
	}

	tests := []testArgs{
		{1, nil},
		{2, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, uplDriver := getMockImagesAPI(ctrl)
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
			resp, err := api.UploadImage(context.Background(), UploadImageRequestObject{RecipeID: test.recipeID, Body: multipart.NewReader(buf, writer.Boundary())})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(UploadImage201JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_DeleteImage(t *testing.T) {
	type testArgs struct {
		recipeID               int64
		imageID                int64
		imageName              string
		expectedReadError      error
		expectedDeleteError    error
		expectedUplDeleteError error
		expectedError          error
	}

	tests := []testArgs{
		{1, 1, "img.jpeg", nil, nil, nil, nil},
		{2, 1, "img.jpeg", db.ErrNotFound, nil, nil, db.ErrNotFound},
		{1, 1, "img.jpeg", nil, io.ErrUnexpectedEOF, nil, io.ErrUnexpectedEOF},
		{1, 1, "img.jpeg", nil, nil, io.ErrClosedPipe, io.ErrClosedPipe},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, uplDriver := getMockImagesAPI(ctrl)
			if test.expectedReadError != nil {
				imagesDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(nil, test.expectedReadError)
			} else {
				imagesDriver.EXPECT().Read(test.recipeID, test.imageID).Return(&models.RecipeImage{ID: &test.imageID, RecipeID: &test.recipeID, Name: &test.imageName}, nil)

				if test.expectedDeleteError != nil {
					imagesDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Return(test.expectedDeleteError)
				} else {
					imagesDriver.EXPECT().Delete(test.recipeID, test.imageID).Return(nil)

					if test.expectedUplDeleteError != nil {
						uplDriver.EXPECT().Delete(gomock.Any()).Return(test.expectedUplDeleteError)
					} else {
						// 2 times; once for original, once for thumbnail
						uplDriver.EXPECT().Delete(gomock.Any()).Times(2).Return(nil)
					}
				}
			}

			// Act
			resp, err := api.DeleteImage(context.Background(), DeleteImageRequestObject{RecipeID: test.recipeID, ImageID: test.imageID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(DeleteImage204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_OptimizeImage(t *testing.T) {
	type testArgs struct {
		recipeID          int64
		imageID           int64
		imageName         string
		expectedReadError error
		expectedLoadError error
		expectedSaveError error
		expectedError     error
	}

	tests := []testArgs{
		{1, 1, "img.jpeg", nil, nil, nil, nil},
		{2, 1, "img.jpeg", db.ErrNotFound, nil, nil, db.ErrNotFound},
		{1, 1, "img.jpeg", nil, io.ErrUnexpectedEOF, nil, io.ErrUnexpectedEOF},
		{1, 1, "img.jpeg", nil, nil, io.ErrClosedPipe, io.ErrClosedPipe},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, imagesDriver, uplDriver := getMockImagesAPI(ctrl)
			if test.expectedReadError != nil {
				imagesDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(nil, test.expectedReadError)
			} else {
				imagesDriver.EXPECT().Read(test.recipeID, test.imageID).Return(&models.RecipeImage{ID: &test.imageID, RecipeID: &test.recipeID, Name: &test.imageName}, nil)

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
			resp, err := api.OptimizeImage(context.Background(), OptimizeImageRequestObject{RecipeID: test.recipeID, ImageID: test.imageID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(OptimizeImage204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func getMockImagesAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockRecipeImageDriver, *fileaccessmock.MockDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	imagesDriver := dbmock.NewMockRecipeImageDriver(ctrl)
	dbDriver.EXPECT().Images().AnyTimes().Return(imagesDriver)
	uplDriver := fileaccessmock.NewMockDriver(ctrl)
	imgCfg := fileaccess.ImageConfig{
		ImageQuality:     fileaccess.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: fileaccess.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := fileaccess.CreateImageUploader(uplDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		upl:        upl,
		db:         dbDriver,
	}
	return api, imagesDriver, uplDriver
}
