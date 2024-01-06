package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image/color"
	"mime/multipart"
	"testing"

	dbmock "github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/disintegration/imaging"
	"github.com/golang/mock/gomock"
)

func Test_Upload(t *testing.T) {
	type testArgs struct {
		expectedError error
	}

	tests := []testArgs{
		{nil},
		{errors.ErrUnsupported},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, uplDriver := getMockUploadsApi(ctrl)
			if test.expectedError != nil {
				uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				uplDriver.EXPECT().Save(gomock.Any(), gomock.Any()).AnyTimes().Return(nil)
			}
			buf := bytes.NewBuffer([]byte{})
			writer := multipart.NewWriter(buf)
			part, err := writer.CreateFormFile("fileupload", "img.jpeg")
			imaging.Encode(part, imaging.New(1, 1, color.Black), imaging.JPEG)
			writer.Close()

			// Act
			resp, err := api.Upload(context.Background(), UploadRequestObject{Body: multipart.NewReader(buf, writer.Boundary())})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(Upload201Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func getMockUploadsApi(ctrl *gomock.Controller) (apiHandler, *uploadmock.MockDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
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
	return api, uplDriver
}
