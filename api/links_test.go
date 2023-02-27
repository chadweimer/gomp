package api

import (
	"context"
	"testing"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/golang/mock/gomock"
)

func Test_GetLinks(t *testing.T) {
	// Arrange
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	api, linkDriver := getMockLinkApi(ctrl)
	expectedLinks := []models.RecipeCompact{
		{},
	}
	linkDriver.EXPECT().List(gomock.Any()).Return(&expectedLinks, nil)

	// Act
	resp, err := api.GetLinks(context.Background(), GetLinksRequestObject{RecipeId: 1})

	// Assert
	if err != nil {
		t.Errorf("received error: %v", err)
	}
	typedResp, ok := resp.(GetLinks200JSONResponse)
	if !ok {
		t.Fatal("invalid response")
	}
	if len(typedResp) != len(expectedLinks) {
		t.Errorf("expected length: %d, actual length: %d", len(expectedLinks), len(typedResp))
	}
}

func Test_GetLinks_NotFound(t *testing.T) {
	// Arrange
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	api, linkDriver := getMockLinkApi(ctrl)
	linkDriver.EXPECT().List(gomock.Any()).Return(nil, db.ErrNotFound)

	// Act
	_, err := api.GetLinks(context.Background(), GetLinksRequestObject{RecipeId: 1})

	// Assert
	if err != db.ErrNotFound {
		t.Error("ErrNotFound was expected")
	}
}

func Test_AddLink(t *testing.T) {
	type addLinkTest struct {
		recipeId     int64
		destRecipeId int64
		expectError  bool
	}

	// Arrange
	var tests = []addLinkTest{
		{1, 2, false},
		{4, 7, false},
		{3, 1, false},
		{2, 9, false},
		{8, 2, true},
	}
	for _, test := range tests {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		api, linkDriver := getMockLinkApi(ctrl)
		if test.expectError {
			linkDriver.EXPECT().Create(gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
		} else {
			linkDriver.EXPECT().Create(test.recipeId, test.destRecipeId).Return(nil)
			linkDriver.EXPECT().Create(gomock.Any(), gomock.Any()).Times(0).Return(db.ErrNotFound)
		}

		// Act
		resp, err := api.AddLink(context.Background(), AddLinkRequestObject{RecipeId: test.recipeId, DestRecipeId: test.destRecipeId})

		// Assert
		if err != nil && !test.expectError {
			t.Errorf("test %v: received error '%v'", test, err)
		} else if err == nil {
			_, ok := resp.(AddLink204Response)
			if !ok {
				t.Errorf("test %v: invalid response", test)
			}
		}
	}
}

func Test_DeleteLink(t *testing.T) {
	type deleteLinkTest struct {
		recipeId     int64
		destRecipeId int64
		expectError  bool
	}

	// Arrange
	var tests = []deleteLinkTest{
		{1, 2, false},
		{4, 7, false},
		{3, 1, false},
		{2, 9, false},
		{8, 2, true},
	}
	for _, test := range tests {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		api, linkDriver := getMockLinkApi(ctrl)
		if test.expectError {
			linkDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
		} else {
			linkDriver.EXPECT().Delete(test.recipeId, test.destRecipeId).Return(nil)
			linkDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Times(0).Return(db.ErrNotFound)
		}

		// Act
		resp, err := api.DeleteLink(context.Background(), DeleteLinkRequestObject{RecipeId: test.recipeId, DestRecipeId: test.destRecipeId})

		// Assert
		if err != nil && !test.expectError {
			t.Errorf("test %v: received error '%v'", test, err)
		} else if err == nil {
			_, ok := resp.(DeleteLink204Response)
			if !ok {
				t.Errorf("test %v: invalid response", test)
			}
		}
	}
}

func getMockLinkApi(ctrl *gomock.Controller) (apiHandler, *dbmock.MockLinkDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	linkDriver := dbmock.NewMockLinkDriver(ctrl)
	dbDriver.EXPECT().Links().AnyTimes().Return(linkDriver)

	api := apiHandler{
		secureKeys: []string{},
		upl:        upload.NewMockDriver(ctrl),
		db:         dbDriver,
	}
	return api, linkDriver
}
