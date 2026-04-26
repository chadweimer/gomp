package api

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
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
	"go.uber.org/mock/gomock"
)

func Test_GetImages(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		images        []string
		mockFS        fstest.MapFS
		expectedError error
	}

	tests := []testArgs{
		{
			1,
			[]string{"plated-dish.jpg"},
			fstest.MapFS{
				"plated-dish.jpg": &fstest.MapFile{
					Data:    []byte{},
					Mode:    fs.ModeAppend,
					ModTime: time.Now(),
				},
			},
			nil,
		},
		{
			2,
			nil,
			nil,
			db.ErrNotFound,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, _, uplDriver := getMockImagesAPI(ctrl)
			if test.expectedError != nil {
				uplDriver.EXPECT().List(gomock.Any()).Return(nil, test.expectedError)
			} else {
				entries, _ := test.mockFS.ReadDir(".")
				uplDriver.EXPECT().List(gomock.Any()).Return(entries, nil)
			}

			// Act
			resp, err := api.GetImages(t.Context(), GetImagesRequestObject{RecipeID: test.recipeID})

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

func Test_UploadImage(t *testing.T) {
	type testArgs struct {
		name                  string
		recipe                models.Recipe
		mockFS                fstest.MapFS
		expectUpdateMainImage bool
		expectedError         error
	}

	tests := []testArgs{
		{
			name: "Nominal",
			recipe: models.Recipe{
				ID:            utils.GetPtr[int64](1),
				MainImageName: utils.GetPtr("some-image.jpeg"),
			},
			mockFS: fstest.MapFS{
				"new-image.jpg": &fstest.MapFile{
					Data:    []byte{},
					Mode:    fs.ModeAppend,
					ModTime: time.Now(),
				},
			},
			expectUpdateMainImage: false,
			expectedError:         nil,
		},
		{
			name: "No Main Image",
			recipe: models.Recipe{
				ID: utils.GetPtr[int64](1),
			},
			mockFS: fstest.MapFS{
				"new-image.jpg": &fstest.MapFile{
					Data:    []byte{},
					Mode:    fs.ModeAppend,
					ModTime: time.Now(),
				},
			},
			expectUpdateMainImage: true,
			expectedError:         nil,
		},
		{
			name: "Not Found",
			recipe: models.Recipe{
				ID: utils.GetPtr[int64](2),
			},
			expectUpdateMainImage: false,
			expectedError:         db.ErrNotFound,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, dbDriver, uplDriver := getMockImagesAPI(ctrl)
			if test.expectedError != nil {
				uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).AnyTimes().Return(nil)
				entries, _ := test.mockFS.ReadDir(".")
				uplDriver.EXPECT().List(gomock.Any()).Return(entries, nil)
				dbDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(&test.recipe, nil)
				if test.expectUpdateMainImage {
					dbDriver.EXPECT().Update(gomock.Any(), gomock.Any()).Return(nil)
				}
			}
			buf := bytes.NewBuffer([]byte{})
			writer := multipart.NewWriter(buf)
			part, err := writer.CreateFormFile("fileupload", "img.jpeg")
			jpeg.Encode(part, image.NewGray(image.Rect(0, 0, 1, 1)), nil)
			writer.Close()

			// Act
			resp, err := api.UploadImage(t.Context(), UploadImageRequestObject{RecipeID: *test.recipe.ID, Body: multipart.NewReader(buf, writer.Boundary())})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(UploadImage201Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_DeleteImage(t *testing.T) {
	type testArgs struct {
		name                   string
		recipe                 models.Recipe
		imageName              string
		expectUpdateMainImage  bool
		expectedUplDeleteError error
		expectedError          error
	}

	tests := []testArgs{
		{
			name:                   "Nominal",
			recipe:                 models.Recipe{ID: utils.GetPtr[int64](1)},
			imageName:              "img.jpeg",
			expectUpdateMainImage:  false,
			expectedUplDeleteError: nil,
			expectedError:          nil,
		},
		{
			name:                   "Error",
			recipe:                 models.Recipe{ID: utils.GetPtr[int64](2)},
			imageName:              "img.jpeg",
			expectUpdateMainImage:  false,
			expectedUplDeleteError: io.ErrClosedPipe,
			expectedError:          io.ErrClosedPipe,
		},
		{
			name: "Main Image Deleted",
			recipe: models.Recipe{
				ID:            utils.GetPtr[int64](2),
				MainImageName: utils.GetPtr("img.jpeg"),
			},
			imageName:              "img.jpeg",
			expectUpdateMainImage:  true,
			expectedUplDeleteError: nil,
			expectedError:          nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, dbDriver, uplDriver := getMockImagesAPI(ctrl)
			if test.expectedUplDeleteError != nil {
				uplDriver.EXPECT().Delete(gomock.Any()).Return(test.expectedUplDeleteError)
			} else {
				// 2 times; once for original, once for thumbnail
				uplDriver.EXPECT().Delete(gomock.Any()).Times(2).Return(nil)
				uplDriver.EXPECT().List(gomock.Any())
				dbDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(&test.recipe, nil)
				if test.expectUpdateMainImage {
					dbDriver.EXPECT().Update(gomock.Any(), gomock.Any()).Return(nil)
				}
			}

			// Act
			resp, err := api.DeleteImage(t.Context(), DeleteImageRequestObject{RecipeID: *test.recipe.ID, Name: test.imageName})

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
		caseName          string
		recipeID          int64
		originalName      string
		expectedName      string
		expectedLoadError error
		expectedSaveError error
		expectedError     error
	}

	tests := []testArgs{
		{
			caseName:          "Nominal",
			recipeID:          1,
			originalName:      "img.jpeg",
			expectedName:      "img.jpeg",
			expectedLoadError: nil,
			expectedSaveError: nil,
			expectedError:     nil,
		},
		{
			caseName:          "JPG Extension",
			recipeID:          1,
			originalName:      "img.jpg",
			expectedName:      "img.jpg",
			expectedLoadError: nil,
			expectedSaveError: nil,
			expectedError:     nil,
		},
		{
			caseName:          "PNG Format",
			recipeID:          1,
			originalName:      "img.png",
			expectedName:      "img.jpeg",
			expectedLoadError: nil,
			expectedSaveError: nil,
			expectedError:     nil,
		},
		{
			caseName:          "EOF",
			recipeID:          1,
			originalName:      "img.jpeg",
			expectedName:      "img.jpeg",
			expectedLoadError: io.ErrUnexpectedEOF,
			expectedSaveError: nil,
			expectedError:     io.ErrUnexpectedEOF,
		},
		{
			caseName:          "Closed Pipe",
			recipeID:          1,
			originalName:      "img.jpeg",
			expectedName:      "img.jpeg",
			expectedLoadError: nil,
			expectedSaveError: io.ErrClosedPipe,
			expectedError:     io.ErrClosedPipe,
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, _, uplDriver := getMockImagesAPI(ctrl)
			if test.expectedLoadError != nil {
				uplDriver.EXPECT().Open(gomock.Any()).Return(nil, test.expectedLoadError)
			} else {
				buf := bytes.NewBuffer([]byte{})
				jpeg.Encode(buf, image.NewGray(image.Rect(0, 0, 1, 1)), nil)
				fs := fstest.MapFS{
					test.originalName: &fstest.MapFile{
						Data:    buf.Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}
				uplDriver.EXPECT().Open(gomock.Any()).Return(fs.Open(test.originalName))

				if test.originalName != test.expectedName {
					uplDriver.EXPECT().Delete(gomock.Any()).Return(nil).Times(2)
				}

				if test.expectedSaveError != nil {
					uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Return(test.expectedSaveError)
				} else {
					// 2 times; once for original, once for thumbnail
					uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Times(2).Return(nil)
				}
			}

			// Act
			resp, err := api.OptimizeImage(t.Context(), OptimizeImageRequestObject{RecipeID: test.recipeID, Name: test.originalName})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(OptimizeImage200Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func getMockImagesAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockRecipeDriver, *fileaccessmock.MockDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	recipeDriver := dbmock.NewMockRecipeDriver(ctrl)
	dbDriver.EXPECT().Recipes().AnyTimes().Return(recipeDriver)
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
	return api, recipeDriver, uplDriver
}
