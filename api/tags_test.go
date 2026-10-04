package api

import (
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/infra"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
)

func Test_GetAllTags(t *testing.T) {
	type testArgs struct {
		params          GetAllTagsParams
		expectedSortBy  models.TagSortBy
		expectedSortDir models.SortDir
		expectedPage    int64
		expectedCount   int64
		tags            *[]models.Tag
		total           int64
		dbError         error
		expectedError   error
	}

	sortByCount := models.TagSortByCount
	sortDirDesc := models.Desc
	pageVal := int64(2)
	countVal := int64(20)

	tests := []testArgs{
		{
			params:          GetAllTagsParams{},
			expectedSortBy:  models.TagSortByTag,
			expectedSortDir: models.Asc,
			expectedPage:    1,
			expectedCount:   0,
			tags:            &[]models.Tag{{Tag: "tag1", Count: 2}, {Tag: "tag2", Count: 3}},
			total:           2,
		},
		{
			params: GetAllTagsParams{
				Sort:  &sortByCount,
				Dir:   &sortDirDesc,
				Page:  &pageVal,
				Count: countVal,
			},
			expectedSortBy:  sortByCount,
			expectedSortDir: sortDirDesc,
			expectedPage:    pageVal,
			expectedCount:   countVal,
			tags:            &[]models.Tag{{Tag: "tag1", Count: 10}},
			total:           15,
		},
		{
			params: GetAllTagsParams{
				Count: 10,
			},
			expectedSortBy:  models.TagSortByTag,
			expectedSortDir: models.Asc,
			expectedPage:    1,
			expectedCount:   10,
			dbError:         db.ErrNotFound,
			expectedError:   db.ErrNotFound,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, tagDriver := getMockTagsAPI(ctrl)
			if test.dbError != nil {
				tagDriver.EXPECT().List(t.Context(), test.expectedSortBy, test.expectedSortDir, test.expectedPage, test.expectedCount).Return(nil, int64(0), test.dbError)
			} else {
				tagDriver.EXPECT().List(t.Context(), test.expectedSortBy, test.expectedSortDir, test.expectedPage, test.expectedCount).Return(test.tags, test.total, nil)
			}

			// Act
			resp, err := api.GetAllTags(t.Context(), GetAllTagsRequestObject{Params: test.params})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: expected error: %v, received error '%v'", test, test.expectedError, err)
			} else if err == nil {
				got, ok := resp.(GetAllTags200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if got.Total != test.total {
					t.Errorf("test %v: expected total: %d, got: %d", test, test.total, got.Total)
				}
				if !reflect.DeepEqual(got.Tags, test.tags) {
					t.Errorf("test %v: got = %v, want %v", test, got.Tags, test.tags)
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
		tokenHandler: infra.NewTokenHandler([]string{"secure-key"}),
		upl:          upl,
		db:           dbDriver,
	}
	return api, tagDriver
}
