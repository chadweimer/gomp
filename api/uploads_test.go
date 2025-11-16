package api

import (
	"bytes"
	"errors"
	"fmt"
	"image/color"
	"mime/multipart"
	"testing"

	dbmock "github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/upload"
	"github.com/disintegration/imaging"
	"go.uber.org/mock/gomock"
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

			api, uplDriver := getMockUploadsAPI(ctrl)
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
			resp, err := api.Upload(t.Context(), UploadRequestObject{Body: multipart.NewReader(buf, writer.Boundary())})

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

func getMockUploadsAPI(ctrl *gomock.Controller) (apiHandler, *uploadmock.MockDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	uplDriver := uploadmock.NewMockDriver(ctrl)
	imgCfg := upload.ImageConfig{
		ImageQuality:     upload.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: upload.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := upload.CreateImageUploader(uplDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		upl:        upl,
		db:         dbDriver,
	}
	return api, uplDriver
}
