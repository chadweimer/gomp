package upload

import (
	"bytes"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"path/filepath"
	"testing"

	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"go.uber.org/mock/gomock"
)

func Test_Save(t *testing.T) {
	type testArgs struct {
		caseName              string
		cfg                   ImageConfig
		recipeID              int64
		originalName          string
		srcImage              image.Image
		expectedName          string
		expectedImagePath     string
		expectedThumbnailPath string
		expectedURL           string
		expectedThumbnailURL  string
		expectedSaveError     error
	}

	// Arrange
	tests := []testArgs{
		{
			caseName: "Original Quality",
			cfg: ImageConfig{
				ImageQuality:     ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: ImageQualityMedium,
				ThumbnailSize:    50,
			},
			recipeID:              42,
			originalName:          "picture.jpeg",
			srcImage:              image.NewRGBA(image.Rect(0, 0, 500, 300)),
			expectedName:          "picture.jpeg",
			expectedImagePath:     "recipes/42/images/picture.jpeg",
			expectedThumbnailPath: "recipes/42/thumbs/picture.jpeg",
			expectedURL:           "/uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailURL:  "/uploads/recipes/42/thumbs/picture.jpeg",
			expectedSaveError:     nil,
		},
		{
			caseName: "High Quality",
			cfg: ImageConfig{
				ImageQuality:     ImageQualityHigh,
				ImageSize:        200,
				ThumbnailQuality: ImageQualityMedium,
				ThumbnailSize:    50,
			},
			recipeID:              42,
			originalName:          "picture.jpg",
			srcImage:              image.NewRGBA(image.Rect(0, 0, 500, 300)),
			expectedName:          "picture.jpeg",
			expectedImagePath:     "recipes/42/images/picture.jpeg",
			expectedThumbnailPath: "recipes/42/thumbs/picture.jpeg",
			expectedURL:           "/uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailURL:  "/uploads/recipes/42/thumbs/picture.jpeg",
			expectedSaveError:     nil,
		},
		{
			caseName: "PNG Input",
			cfg: ImageConfig{
				ImageQuality:     ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: ImageQualityMedium,
				ThumbnailSize:    50,
			},
			recipeID:              42,
			originalName:          "picture.png",
			srcImage:              image.NewRGBA(image.Rect(0, 0, 500, 300)),
			expectedName:          "picture.jpeg",
			expectedImagePath:     "recipes/42/images/picture.jpeg",
			expectedThumbnailPath: "recipes/42/thumbs/picture.jpeg",
			expectedURL:           "/uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailURL:  "/uploads/recipes/42/thumbs/picture.jpeg",
			expectedSaveError:     nil,
		},
		{
			caseName: "Invalid Image",
			cfg: ImageConfig{
				ImageQuality:     ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: ImageQualityMedium,
				ThumbnailSize:    50,
			},
			recipeID:          42,
			originalName:      "picture.jpg",
			srcImage:          nil,
			expectedSaveError: ErrInvalidContentType,
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			drv := uploadmock.NewMockDriver(ctrl)
			if test.expectedSaveError == nil {
				drv.EXPECT().Save(test.expectedImagePath, gomock.Any()).Return(nil).Times(1)
				drv.EXPECT().Save(test.expectedThumbnailPath, gomock.Any()).Return(nil).Times(1)
			}

			uploader, err := CreateImageUploader(drv, test.cfg)
			if err != nil {
				t.Fatalf("CreateImageUploader: %v", err)
			}

			var data []byte
			if test.srcImage != nil {
				// Create a simple image in memory
				buf := new(bytes.Buffer)
				switch filepath.Ext(test.originalName) {
				case ".png":
					err = png.Encode(buf, test.srcImage)
				default:
					err = jpeg.Encode(buf, test.srcImage, &jpeg.Options{Quality: 85})
				}
				if err != nil {
					t.Fatalf("failed to encode image: %v", err)
				}
				data = buf.Bytes()
			} else {
				data = []byte("this is not an image")
			}

			res, err := uploader.Save(test.recipeID, test.originalName, data)
			if !errors.Is(err, test.expectedSaveError) {
				t.Fatalf("expected error: %v, received error: %v", test.expectedSaveError, err)
			}
			if err != nil {
				return
			}

			if res.Name != test.expectedName {
				t.Fatalf("unexpected saved name: %s", res.Name)
			}

			// Check URLs are what saveImage constructs (note driver prepends root)
			if res.URL != test.expectedURL {
				t.Fatalf("unexpected image url: %s != %s", res.URL, test.expectedURL)
			}
			if res.ThumbnailURL != test.expectedThumbnailURL {
				t.Fatalf("unexpected thumbnail url: %s != %s", res.ThumbnailURL, test.expectedThumbnailURL)
			}
		})
	}
}

func Test_Delete(t *testing.T) {
	type testArgs struct {
		caseName              string
		recipeID              int64
		originalName          string
		expectedName          string
		expectedImagePath     string
		expectedThumbnailPath string
		expectedURL           string
		expectedThumbnailURL  string
	}

	// Arrange
	tests := []testArgs{
		{
			caseName:              "Nominal Case",
			recipeID:              42,
			originalName:          "picture.jpeg",
			expectedImagePath:     "recipes/42/images/picture.jpeg",
			expectedThumbnailPath: "recipes/42/thumbs/picture.jpeg",
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			drv := uploadmock.NewMockDriver(ctrl)
			// Delete should remove both files
			drv.EXPECT().Delete(test.expectedImagePath).Return(nil).Times(1)
			drv.EXPECT().Delete(test.expectedThumbnailPath).Return(nil).Times(1)

			imgCfg := ImageConfig{
				ImageQuality:     ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: ImageQualityMedium,
				ThumbnailSize:    50,
			}

			uploader, err := CreateImageUploader(drv, imgCfg)
			if err != nil {
				t.Fatalf("CreateImageUploader: %v", err)
			}

			if err := uploader.Delete(test.recipeID, test.originalName); err != nil {
				t.Fatalf("Delete returned error: %v", err)
			}
		})
	}
}

func Test_DeleteAll(t *testing.T) {
	type testArgs struct {
		caseName        string
		recipeID        int64
		expectedDirPath string
	}

	// Arrange
	tests := []testArgs{
		{
			caseName:        "Nominal Case",
			recipeID:        42,
			expectedDirPath: "recipes/42",
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			drv := uploadmock.NewMockDriver(ctrl)
			// Delete all should remove the entire directory
			drv.EXPECT().DeleteAll(test.expectedDirPath).Return(nil).Times(1)

			imgCfg := ImageConfig{
				ImageQuality:     ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: ImageQualityMedium,
				ThumbnailSize:    50,
			}

			uploader, err := CreateImageUploader(drv, imgCfg)
			if err != nil {
				t.Fatalf("CreateImageUploader: %v", err)
			}

			if err := uploader.DeleteAll(test.recipeID); err != nil {
				t.Fatalf("Delete returned error: %v", err)
			}
		})
	}
}

func Test_fit(t *testing.T) {
	// src 400x200, size 100 -> fit should be 100x50
	src := image.Rect(0, 0, 400, 200)
	f := fit(src, 100)
	if f.Dx() != 100 || f.Dy() != 50 {
		t.Fatalf("fit returned wrong size: %v", f)
	}
}

func Test_cover(t *testing.T) {
	// src 400x200, size 100
	src := image.Rect(0, 0, 400, 200)
	// cover should scale to fill 100x100 box -> scale = 0.5 -> newW=200 newH=100, offsetX=(200-100)/2=50
	c := cover(src, 100)
	if c.Dx() != 200 || c.Dy() != 100 {
		t.Fatalf("cover did not return box size: %v", c)
	}
	// The crop rectangle's origin should be offset
	if c.Min.X != 50 {
		t.Fatalf("cover returned unexpected Min.X: %d", c.Min.X)
	}
}
