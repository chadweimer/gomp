package api

import (
	"context"
	"testing"

	"github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/golang/mock/gomock"
)

func Test_GetConfiguration(t *testing.T) {
	// Arrange
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	api, appDriver := getMockAppConfigurationApi(ctrl)
	const expectedTitle = "The App Title"
	appDriver.EXPECT().Read().Return(&models.AppConfiguration{
		Title: expectedTitle,
	}, nil)

	// Act
	resp, err := api.GetConfiguration(context.Background(), GetConfigurationRequestObject{})

	// Assert
	if err != nil {
		t.Errorf("received error: %v", err)
	}
	typedResp, ok := resp.(GetConfiguration200JSONResponse)
	if !ok {
		t.Fatal("invalid response")
	}
	if typedResp.Title != expectedTitle {
		t.Errorf("unexpected title: %s", typedResp.Title)
	}
}

func Test_SaveConfiguration(t *testing.T) {
	// Arrange
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	api, appDriver := getMockAppConfigurationApi(ctrl)
	const expectedTitle = "The App Title"
	appCfg := &models.AppConfiguration{Title: expectedTitle}
	appDriver.EXPECT().Update(appCfg).Times(1)

	// Act
	resp, err := api.SaveConfiguration(context.Background(), SaveConfigurationRequestObject{Body: appCfg})

	// Assert
	if err != nil {
		t.Errorf("received error: %v", err)
	}
	_, ok := resp.(SaveConfiguration204Response)
	if !ok {
		t.Fatal("invalid response")
	}
}

func getMockAppConfigurationApi(ctrl *gomock.Controller) (apiHandler, *db.MockAppConfigurationDriver) {
	dbDriver := db.NewMockDriver(ctrl)
	appDriver := db.NewMockAppConfigurationDriver(ctrl)
	dbDriver.EXPECT().AppConfiguration().Return(appDriver)

	api := apiHandler{
		secureKeys: []string{},
		upl:        upload.NewMockDriver(ctrl),
		db:         dbDriver,
	}
	return api, appDriver
}
