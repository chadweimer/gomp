package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image/color"
	"mime/multipart"
	"testing"

	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
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

			api, fsDriver := getMockUploadsAPI(ctrl)
			if test.expectedError != nil {
				fsDriver.EXPECT().Save(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				fsDriver.EXPECT().Save(gomock.Any(), gomock.Any()).AnyTimes().Return(nil)
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

func getMockUploadsAPI(ctrl *gomock.Controller) (apiHandler, *fileaccessmock.MockDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	fsDriver := fileaccessmock.NewMockDriver(ctrl)
	imgCfg := fileaccess.ImageConfig{
		ImageQuality:     fileaccess.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: fileaccess.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := fileaccess.CreateImageUploader(fsDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		fs:         fsDriver,
		upl:        upl,
		db:         dbDriver,
	}
	return api, fsDriver
}
