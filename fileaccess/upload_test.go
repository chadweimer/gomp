package fileaccess

import (
	"bytes"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"io/fs"
	"path/filepath"
	"testing"

	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
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
				ImageQuality:     models.ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: models.ImageQualityMedium,
				ThumbnailSize:    50,
			},
			recipeID:              42,
			originalName:          "picture.jpeg",
			srcImage:              image.NewRGBA(image.Rect(0, 0, 500, 300)),
			expectedName:          "picture.jpeg",
			expectedImagePath:     "uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailPath: "uploads/recipes/42/thumbs/picture.jpeg",
			expectedURL:           "/uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailURL:  "/uploads/recipes/42/thumbs/picture.jpeg",
			expectedSaveError:     nil,
		},
		{
			caseName: "High Quality",
			cfg: ImageConfig{
				ImageQuality:     models.ImageQualityHigh,
				ImageSize:        200,
				ThumbnailQuality: models.ImageQualityMedium,
				ThumbnailSize:    50,
			},
			recipeID:              42,
			originalName:          "picture.jpeg",
			srcImage:              image.NewRGBA(image.Rect(0, 0, 500, 300)),
			expectedName:          "picture.jpeg",
			expectedImagePath:     "uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailPath: "uploads/recipes/42/thumbs/picture.jpeg",
			expectedURL:           "/uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailURL:  "/uploads/recipes/42/thumbs/picture.jpeg",
			expectedSaveError:     nil,
		},
		{
			caseName: "PNG Input",
			cfg: ImageConfig{
				ImageQuality:     models.ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: models.ImageQualityMedium,
				ThumbnailSize:    50,
			},
			recipeID:              42,
			originalName:          "picture.png",
			srcImage:              image.NewRGBA(image.Rect(0, 0, 500, 300)),
			expectedName:          "picture.jpeg",
			expectedImagePath:     "uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailPath: "uploads/recipes/42/thumbs/picture.jpeg",
			expectedURL:           "/uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailURL:  "/uploads/recipes/42/thumbs/picture.jpeg",
			expectedSaveError:     nil,
		},
		{
			caseName: "JPG File Extension",
			cfg: ImageConfig{
				ImageQuality:     models.ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: models.ImageQualityMedium,
				ThumbnailSize:    50,
			},
			recipeID:              42,
			originalName:          "picture.jpg",
			srcImage:              image.NewRGBA(image.Rect(0, 0, 500, 300)),
			expectedName:          "picture.jpg",
			expectedImagePath:     "uploads/recipes/42/images/picture.jpg",
			expectedThumbnailPath: "uploads/recipes/42/thumbs/picture.jpg",
			expectedURL:           "/uploads/recipes/42/images/picture.jpg",
			expectedThumbnailURL:  "/uploads/recipes/42/thumbs/picture.jpg",
			expectedSaveError:     nil,
		},
		{
			caseName: "Invalid Image",
			cfg: ImageConfig{
				ImageQuality:     models.ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: models.ImageQualityMedium,
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

			drv := fileaccessmock.NewMockDriver(ctrl)
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
			expectedImagePath:     "uploads/recipes/42/images/picture.jpeg",
			expectedThumbnailPath: "uploads/recipes/42/thumbs/picture.jpeg",
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			drv := fileaccessmock.NewMockDriver(ctrl)
			// Delete should remove both files
			drv.EXPECT().Delete(test.expectedImagePath).Return(nil).Times(1)
			drv.EXPECT().Delete(test.expectedThumbnailPath).Return(nil).Times(1)

			imgCfg := ImageConfig{
				ImageQuality:     models.ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: models.ImageQualityMedium,
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
			expectedDirPath: "uploads/recipes/42",
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			drv := fileaccessmock.NewMockDriver(ctrl)
			// Delete all should remove the entire directory
			drv.EXPECT().DeleteAll(test.expectedDirPath).Return(nil).Times(1)

			imgCfg := ImageConfig{
				ImageQuality:     models.ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: models.ImageQualityMedium,
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

func Test_List(t *testing.T) {
	tests := []struct {
		name     string
		recipeID int64
		entries  []fs.DirEntry
		listErr  error
		expected []string
	}{
		{name: "No Files", recipeID: 123, entries: []fs.DirEntry{}, expected: []string{}},
		{
			name:     "With Files",
			recipeID: 42,
			entries: []fs.DirEntry{
				testDirEntry{name: "a.jpeg", dir: false},
				testDirEntry{name: "b.png", dir: false},
				testDirEntry{name: "c.png", dir: false},
			},
			expected: []string{"a.jpeg", "b.png", "c.png"},
		},
		{
			name:     "With Files and Dirs",
			recipeID: 42,
			entries: []fs.DirEntry{
				testDirEntry{name: "a.jpeg", dir: false},
				testDirEntry{name: "b.png", dir: false},
				testDirEntry{name: "subdir", dir: true},
				testDirEntry{name: "subdir/c.png", dir: true},
			},
			expected: []string{"a.jpeg", "b.png"},
		},
		{name: "Error", recipeID: 7, listErr: errors.New("driver failure")},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			drv := fileaccessmock.NewMockDriver(ctrl)
			dirPath := getDirPathForImage(tt.recipeID)

			if tt.listErr != nil {
				drv.EXPECT().List(dirPath).Return(nil, tt.listErr).Times(1)
			} else {
				drv.EXPECT().List(dirPath).Return(tt.entries, nil).Times(1)
			}

			imgCfg := ImageConfig{
				ImageQuality:     models.ImageQualityOriginal,
				ImageSize:        200,
				ThumbnailQuality: models.ImageQualityMedium,
				ThumbnailSize:    50,
			}
			uploader, err := CreateImageUploader(drv, imgCfg)
			if err != nil {
				t.Fatalf("CreateImageUploader: %v", err)
			}

			got, err := uploader.List(tt.recipeID)
			if tt.listErr != nil {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if !errors.Is(err, tt.listErr) {
					t.Fatalf("expected wrapped error to be testErr, got: %v", err)
				}
				return
			}

			if err != nil {
				t.Fatalf("List returned error: %v", err)
			}
			if len(got) != len(tt.expected) {
				t.Fatalf("expected %d files, got %d: %v", len(tt.expected), len(got), got)
			}
			for i := range tt.expected {
				if got[i] != tt.expected[i] {
					t.Fatalf("unexpected file list: %v", got)
				}
			}
		})
	}
}

func Test_fit(t *testing.T) {
	type testArgs struct {
		caseName string
		src      image.Rectangle
		size     int
		expected image.Rectangle
	}

	// Arrange
	tests := []testArgs{
		{
			caseName: "400x200 to 100",
			src:      image.Rect(0, 0, 400, 200),
			size:     100,
			expected: image.Rect(0, 0, 100, 50),
		},
		{
			caseName: "200x400 to 100",
			src:      image.Rect(0, 0, 200, 400),
			size:     100,
			expected: image.Rect(0, 0, 50, 100),
		},
		{
			caseName: "75x50 to 100",
			src:      image.Rect(0, 0, 75, 50),
			size:     100,
			expected: image.Rect(0, 0, 100, 67),
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			actual := fit(test.src, test.size)
			if actual != test.expected {
				t.Errorf("expected: %s, actual: %s", test.expected, actual)
			}
		})
	}
}

func Test_cover(t *testing.T) {
	type testArgs struct {
		caseName       string
		src            image.Rectangle
		size           int
		expectedResize image.Rectangle
		expectedCrop   image.Rectangle
	}

	// Arrange
	tests := []testArgs{
		{
			caseName:       "400x200 to 100",
			src:            image.Rect(0, 0, 400, 200),
			size:           100,
			expectedResize: image.Rect(0, 0, 200, 100),
			expectedCrop:   image.Rect(50, 0, 150, 100),
		},
		{
			caseName:       "200x400 to 100",
			src:            image.Rect(0, 0, 200, 400),
			size:           100,
			expectedResize: image.Rect(0, 0, 100, 200),
			expectedCrop:   image.Rect(0, 50, 100, 150),
		},
		{
			caseName:       "75x50 to 100",
			src:            image.Rect(0, 0, 75, 50),
			size:           100,
			expectedResize: image.Rect(0, 0, 150, 100),
			expectedCrop:   image.Rect(25, 0, 125, 100),
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			actualResize, actualCrop := cover(test.src, test.size)
			if actualResize != test.expectedResize {
				t.Errorf("expected resize: %s, actual resize: %s", test.expectedResize, actualResize)
			}
			if actualCrop != test.expectedCrop {
				t.Errorf("expected crop: %s, actual crop: %s", test.expectedCrop, actualCrop)
			}
		})
	}
}

type testDirEntry struct {
	name string
	dir  bool
}

func (t testDirEntry) Name() string { return t.name }
func (t testDirEntry) IsDir() bool  { return t.dir }
func (t testDirEntry) Type() fs.FileMode {
	if t.dir {
		return fs.ModeDir
	}
	return 0
}
func (testDirEntry) Info() (fs.FileInfo, error) { return nil, nil }
