package api

import (
	"bytes"
	"errors"
	"image"
	"image/jpeg"
	"io"
	"io/fs"
	"mime/multipart"
	"testing"
	"testing/fstest"
	"time"

	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"github.com/samber/lo"
	"go.uber.org/mock/gomock"
)

func Test_GetImages(t *testing.T) {
	type testArgs struct {
		name             string
		recipeID         int64
		images           []string
		mockFS           fstest.MapFS
		fsError          error
		expectedError    error
		expectedResponse GetImagesResponseObject
	}

	tests := []testArgs{
		{
			name:     "Nominal",
			recipeID: 1,
			images:   []string{"plated-dish.jpg"},
			mockFS: fstest.MapFS{
				"plated-dish.jpg": &fstest.MapFile{
					Data:    []byte{},
					Mode:    fs.ModeAppend,
					ModTime: time.Now(),
				},
			},
			fsError:          nil,
			expectedError:    nil,
			expectedResponse: GetImages200JSONResponse([]string{"plated-dish.jpg"}),
		},
		{
			name:             "Not Found",
			recipeID:         2,
			mockFS:           nil,
			fsError:          fs.ErrNotExist,
			expectedError:    nil,
			expectedResponse: GetImages200JSONResponse([]string{}),
		},
		{
			name:             "FS Error",
			recipeID:         3,
			mockFS:           nil,
			fsError:          fs.ErrClosed,
			expectedError:    fs.ErrClosed,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, _, uplDriver := getMockImagesAPI(ctrl)
			if test.fsError != nil {
				uplDriver.EXPECT().List(gomock.Any()).Return(nil, test.fsError)
			} else {
				entries, _ := test.mockFS.ReadDir(".")
				uplDriver.EXPECT().List(gomock.Any()).Return(entries, nil)
			}

			// Act
			resp, err := api.GetImages(t.Context(), GetImagesRequestObject{RecipeID: test.recipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch expected := test.expectedResponse.(type) {
				case GetImages200JSONResponse:
					got, ok := resp.(GetImages200JSONResponse)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
					if len(got) != len(expected) {
						t.Errorf("expected length: %d, actual length: %d", len(expected), len(got))
					}
					missingImages, unexpectedImages := lo.Difference(got, expected)
					if len(missingImages) > 0 {
						t.Errorf("missing images: %v", missingImages)
					}
					if len(unexpectedImages) > 0 {
						t.Errorf("unexpected images: %v", unexpectedImages)
					}
				case GetImages404Response:
					if _, ok := resp.(GetImages404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type %T", resp)
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
		saveError             error
		expectedError         error
		expectedResponse      UploadImageResponseObject
	}

	tests := []testArgs{
		{
			name: "Nominal",
			recipe: models.Recipe{
				ID:            utils.GetPtr[int64](1),
				MainImageName: "some-image.jpeg",
			},
			mockFS: fstest.MapFS{
				"new-image.jpg": &fstest.MapFile{
					Data:    []byte{},
					Mode:    fs.ModeAppend,
					ModTime: time.Now(),
				},
			},
			expectUpdateMainImage: false,
			saveError:             nil,
			expectedError:         nil,
			expectedResponse:      UploadImage201Response{},
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
			saveError:             nil,
			expectedError:         nil,
			expectedResponse:      UploadImage201Response{},
		},
		{
			name: "Not Found",
			recipe: models.Recipe{
				ID: utils.GetPtr[int64](2),
			},
			expectUpdateMainImage: false,
			saveError:             fs.ErrNotExist,
			expectedError:         nil,
			expectedResponse:      UploadImage404Response{},
		},
		{
			name: "Save Error",
			recipe: models.Recipe{
				ID: utils.GetPtr[int64](3),
			},
			expectUpdateMainImage: false,
			saveError:             io.ErrClosedPipe,
			expectedError:         io.ErrClosedPipe,
			expectedResponse:      nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, dbDriver, uplDriver := getMockImagesAPI(ctrl)
			if test.saveError != nil {
				uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Return(test.saveError)
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
				switch test.expectedResponse.(type) {
				case UploadImage201Response:
					got, ok := resp.(UploadImage201Response)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
					if got.Headers.Location == "" {
						t.Error("expected non-empty Location header")
					}
				case UploadImage404Response:
					if _, ok := resp.(UploadImage404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type %T", resp)
				}
			}
		})
	}
}

func Test_DeleteImage(t *testing.T) {
	type testArgs struct {
		name                  string
		recipe                models.Recipe
		imageName             string
		expectDelete          bool
		expectUpdateMainImage bool
		deleteError           error
		expectedError         error
		expectedResponse      DeleteImageResponseObject
	}

	tests := []testArgs{
		{
			name:                  "Nominal",
			recipe:                models.Recipe{ID: utils.GetPtr[int64](1)},
			imageName:             "img.jpeg",
			expectDelete:          true,
			expectUpdateMainImage: false,
			deleteError:           nil,
			expectedError:         nil,
			expectedResponse:      DeleteImage204Response{},
		},
		{
			name:                  "Not Found",
			recipe:                models.Recipe{ID: utils.GetPtr[int64](2)},
			imageName:             "img.jpeg",
			expectDelete:          false,
			expectUpdateMainImage: false,
			deleteError:           fs.ErrNotExist,
			expectedError:         nil,
			expectedResponse:      DeleteImage404Response{},
		},
		{
			name:                  "Error",
			recipe:                models.Recipe{ID: utils.GetPtr[int64](2)},
			imageName:             "img.jpeg",
			expectDelete:          false,
			expectUpdateMainImage: false,
			deleteError:           io.ErrClosedPipe,
			expectedError:         io.ErrClosedPipe,
			expectedResponse:      nil,
		},
		{
			name: "Main Image Deleted",
			recipe: models.Recipe{
				ID:            utils.GetPtr[int64](2),
				MainImageName: "img.jpeg",
			},
			imageName:             "img.jpeg",
			expectDelete:          true,
			expectUpdateMainImage: true,
			deleteError:           nil,
			expectedError:         nil,
			expectedResponse:      DeleteImage204Response{},
		},
		{
			name: "Unsafe name",
			recipe: models.Recipe{
				ID: utils.GetPtr[int64](2),
			},
			imageName:             "../img.jpeg",
			expectDelete:          false,
			expectUpdateMainImage: false,
			deleteError:           nil,
			expectedError:         nil,
			expectedResponse:      DeleteImage400Response{},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, dbDriver, uplDriver := getMockImagesAPI(ctrl)
			if test.deleteError != nil {
				uplDriver.EXPECT().Delete(gomock.Any()).Return(test.deleteError)
			} else {
				if test.expectDelete {
					// 2 times; once for original, once for thumbnail
					uplDriver.EXPECT().Delete(gomock.Any()).Times(2).Return(nil)
					uplDriver.EXPECT().List(gomock.Any())
					dbDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(&test.recipe, nil)
				}
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
				switch test.expectedResponse.(type) {
				case DeleteImage204Response:
					if _, ok := resp.(DeleteImage204Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case DeleteImage400Response:
					if _, ok := resp.(DeleteImage400Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case DeleteImage404Response:
					if _, ok := resp.(DeleteImage404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type %T", resp)
				}
			}
		})
	}
}

func Test_OptimizeImage(t *testing.T) {
	type testArgs struct {
		name               string
		recipeID           int64
		originalName       string
		expectedName       string
		expectOpen         bool
		expectSave         bool
		expectRecipeUpdate bool
		openError          error
		saveError          error
		expectedError      error
		expectedResponse   OptimizeImageResponseObject
	}

	tests := []testArgs{
		{
			name:               "Nominal",
			recipeID:           1,
			originalName:       "img.jpeg",
			expectedName:       "img.jpeg",
			expectOpen:         true,
			expectSave:         true,
			expectRecipeUpdate: false,
			openError:          nil,
			saveError:          nil,
			expectedError:      nil,
			expectedResponse:   OptimizeImage204Response{},
		},
		{
			name:               "JPG Extension",
			recipeID:           1,
			originalName:       "img.jpg",
			expectedName:       "img.jpg",
			expectOpen:         true,
			expectSave:         true,
			expectRecipeUpdate: false,
			openError:          nil,
			saveError:          nil,
			expectedError:      nil,
			expectedResponse:   OptimizeImage204Response{},
		},
		{
			name:               "PNG Format",
			recipeID:           1,
			originalName:       "img.png",
			expectedName:       "img.jpeg",
			expectOpen:         true,
			expectSave:         true,
			expectRecipeUpdate: true,
			openError:          nil,
			saveError:          nil,
			expectedError:      nil,
			expectedResponse:   OptimizeImage204Response{},
		},
		{
			name:               "EOF on Open",
			recipeID:           1,
			originalName:       "img.jpeg",
			expectedName:       "img.jpeg",
			expectOpen:         true,
			expectSave:         false,
			expectRecipeUpdate: false,
			openError:          io.ErrUnexpectedEOF,
			saveError:          nil,
			expectedError:      io.ErrUnexpectedEOF,
			expectedResponse:   nil,
		},
		{
			name:               "Closed Pipe on Save",
			recipeID:           1,
			originalName:       "img.jpeg",
			expectedName:       "img.jpeg",
			expectOpen:         true,
			expectSave:         true,
			expectRecipeUpdate: false,
			openError:          nil,
			saveError:          io.ErrClosedPipe,
			expectedError:      io.ErrClosedPipe,
			expectedResponse:   nil,
		},
		{
			name:               "Unsafe Name",
			recipeID:           1,
			originalName:       "../img.jpeg",
			expectedName:       "../img.jpeg",
			expectOpen:         false,
			expectSave:         false,
			expectRecipeUpdate: false,
			openError:          nil,
			saveError:          nil,
			expectedError:      nil,
			expectedResponse:   OptimizeImage400Response{},
		},
		{
			name:               "Not Found",
			recipeID:           1,
			originalName:       "img.jpeg",
			expectedName:       "img.jpeg",
			expectOpen:         true,
			expectSave:         false,
			expectRecipeUpdate: false,
			openError:          fs.ErrNotExist,
			saveError:          nil,
			expectedError:      nil,
			expectedResponse:   OptimizeImage404Response{},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, dbDriver, uplDriver := getMockImagesAPI(ctrl)
			if test.expectOpen && test.openError != nil {
				uplDriver.EXPECT().Open(gomock.Any()).Return(nil, test.openError)
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
				if test.expectOpen {
					uplDriver.EXPECT().Open(gomock.Any()).Return(fs.Open(test.originalName))
				}

				if test.originalName != test.expectedName {
					uplDriver.EXPECT().Delete(gomock.Any()).Return(nil).Times(2)
				}

				if test.expectSave {
					if test.saveError != nil {
						uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Return(test.saveError)
					} else {
						// 2 times; once for original, once for thumbnail
						uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Times(2).Return(nil)
					}
				}

				if test.expectRecipeUpdate {
					dbDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(&models.Recipe{ID: utils.GetPtr(test.recipeID), MainImageName: test.originalName}, nil)
					dbDriver.EXPECT().Update(gomock.Any(), gomock.Any()).Return(nil)
				}
			}

			// Act
			resp, err := api.OptimizeImage(t.Context(), OptimizeImageRequestObject{RecipeID: test.recipeID, Name: test.originalName})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case OptimizeImage204Response:
					got, ok := resp.(OptimizeImage204Response)
					if !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
					if got.Headers.Location == "" {
						t.Error("expected non-empty Location header")
					}
				case OptimizeImage400Response:
					if _, ok := resp.(OptimizeImage400Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				case OptimizeImage404Response:
					if _, ok := resp.(OptimizeImage404Response); !ok {
						t.Fatalf("expected %T, got %T", test.expectedResponse, resp)
					}
				default:
					t.Errorf("unexpected response type %T", resp)
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
