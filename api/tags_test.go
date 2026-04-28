package api

import (
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
)

func Test_GetAllTags(t *testing.T) {
	type testArgs struct {
		expectedTags  map[string]int
		expectedError error
	}

	tests := []testArgs{
		{
			map[string]int{"tag1": 2, "tag2": 3},
			nil,
		},
		{map[string]int{}, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, tagDriver := getMockTagsAPI(ctrl)
			if test.expectedError != nil {
				tagDriver.EXPECT().List(t.Context()).Return(nil, test.expectedError)
			} else {
				tagDriver.EXPECT().List(t.Context()).Return(&test.expectedTags, nil)
			}

			// Act
			resp, err := api.GetAllTags(t.Context(), GetAllTagsRequestObject{})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: expected error: %v, received error '%v'", test, test.expectedError, err)
			} else if err == nil {
				got, ok := resp.(GetAllTags200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if !reflect.DeepEqual(got, GetAllTags200JSONResponse(test.expectedTags)) {
					t.Errorf("test %v: got = %v, want %v", test, got, test.expectedTags)
				}
			}
		})
	}
}

func getMockTagsAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockTagDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	tagDriver := dbmock.NewMockTagDriver(ctrl)
	dbDriver.EXPECT().Tags().AnyTimes().Return(tagDriver)
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
	return api, tagDriver
}
