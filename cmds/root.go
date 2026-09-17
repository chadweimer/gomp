package cmds

import (
	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/metadata"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"github.com/urfave/cli/v3"
	"go.uber.org/mock/gomock"
)

// RootCmd returns the root CLI command for the application.
func RootCmd(cfg config.Config) *cli.Command {
	return &cli.Command{
		Usage:           "Go Meal Planner",
		HideHelpCommand: true,
		Version:         metadata.BuildVersion,
		Copyright:       metadata.Copyright,
		Commands: []*cli.Command{
			serveApplicationCmd(cfg),
			databaseCmd(cfg),
			imagesCmd(cfg),
		},
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
