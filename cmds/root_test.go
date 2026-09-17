package cmds

import (
	"testing"

	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/gomp/fileaccess"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
)

func TestRootCmd(t *testing.T) {
	got := RootCmd(config.Config{})
	if got == nil {
		t.Error("RootCmd() returned nil")
	}
}

func getUploadMocks(ctrl *gomock.Controller) (*fileaccessmock.MockDriver, *fileaccess.ImageUploader) {
	uplDriver := fileaccessmock.NewMockDriver(ctrl)
	imgCfg := fileaccess.ImageConfig{
		ImageQuality:     models.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: models.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := fileaccess.CreateImageUploader(uplDriver, imgCfg)

	return uplDriver, upl
}
