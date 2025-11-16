package api

import (
	"context"
	"errors"
	"testing"

	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"go.uber.org/mock/gomock"
)

func Test_GetInfo(t *testing.T) {
	// Arrange
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	api, _ := getMockAppConfigurationAPI(ctrl)

	// Act
	resp, err := api.GetInfo(context.Background(), GetInfoRequestObject{})

	// Assert
	if err != nil {
		t.Errorf("received error: %v", err)
	} else {
		typedResp, ok := resp.(GetInfo200JSONResponse)
		if !ok {
			t.Fatal("invalid response")
		}
		if typedResp.Version != &metadata.BuildVersion {
			t.Errorf("unexpected version: %s", *typedResp.Version)
		}
	}
}

func Test_GetConfiguration(t *testing.T) {
	tests := []bool{false, true}
	for _, expectError := range tests {
		// Arrange
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		api, appDriver := getMockAppConfigurationAPI(ctrl)
		const expectedTitle = "The App Title"
		if expectError {
			appDriver.EXPECT().Read().Return(nil, errors.New("an error"))
		} else {
			appDriver.EXPECT().Read().Return(&models.AppConfiguration{
				Title: expectedTitle,
			}, nil)
		}

		// Act
		resp, err := api.GetConfiguration(context.Background(), GetConfigurationRequestObject{})

		// Assert
		if (err != nil) != expectError {
			t.Errorf("error expected?: %v, received error: %v", expectError, err)
		} else if err == nil {
			typedResp, ok := resp.(GetConfiguration200JSONResponse)
			if !ok {
				t.Fatal("invalid response")
			}
			if typedResp.Title != expectedTitle {
				t.Errorf("expected title: %s, received title: %s", expectedTitle, typedResp.Title)
			}
		}
	}
}

func Test_SaveConfiguration(t *testing.T) {
	tests := []bool{false, true}
	for _, expectError := range tests {
		// Arrange
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		api, appDriver := getMockAppConfigurationAPI(ctrl)
		const expectedTitle = "The App Title"
		appCfg := &models.AppConfiguration{Title: expectedTitle}
		if expectError {
			appDriver.EXPECT().Update(appCfg).Return(errors.New("an error"))
		} else {
			appDriver.EXPECT().Update(appCfg)
		}

		// Act
		resp, err := api.SaveConfiguration(context.Background(), SaveConfigurationRequestObject{Body: appCfg})

		// Assert
		if (err != nil) != expectError {
			t.Errorf("error expected?: %v, received error: %v", expectError, err)
		} else if err == nil {
			_, ok := resp.(SaveConfiguration204Response)
			if !ok {
				t.Fatal("invalid response")
			}
		}
	}
}

func getMockAppConfigurationAPI(ctrl *gomock.Controller) (apiHandler, *db.MockAppConfigurationDriver) {
	dbDriver := db.NewMockDriver(ctrl)
	appDriver := db.NewMockAppConfigurationDriver(ctrl)
	dbDriver.EXPECT().AppConfiguration().AnyTimes().Return(appDriver)
	uplDriver := uploadmock.NewMockDriver(ctrl)
	imgCfg := upload.ImageConfig{
		ImageQuality:     upload.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: upload.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := upload.CreateImageUploader(uplDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{},
		upl:        upl,
		db:         dbDriver,
	}
	return api, appDriver
}
