package main

import (
	"bytes"
	"errors"
	"image"
	"image/jpeg"
	"io"
	"io/fs"
	"testing"
	"testing/fstest"
	"time"

	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
)

func Test_optimizeImage(t *testing.T) {
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
			expectedError:      fs.ErrNotExist,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			dbDriver, recipeDriver, uplDriver, uploader := getMocks(ctrl)
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
					recipeDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(&models.Recipe{ID: new(test.recipeID), MainImageName: test.originalName}, nil)
					recipeDriver.EXPECT().Update(gomock.Any(), gomock.Any()).Return(nil)
				}
			}

			// Act
			err := optimizeImage(t.Context(), dbDriver, uploader, test.recipeID, test.originalName)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
		})
	}
}

func getMocks(ctrl *gomock.Controller) (*dbmock.MockDriver, *dbmock.MockRecipeDriver, *fileaccessmock.MockDriver, *fileaccess.ImageUploader) {
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

	return dbDriver, recipeDriver, uplDriver, upl
}
