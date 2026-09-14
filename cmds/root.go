package cmds

import (
	"github.com/chadweimer/gomp/config"
	"github.com/urfave/cli/v3"
)

// RootCmd returns the root CLI command for the application.
func RootCmd(cfg config.Config) *cli.Command {
	return &cli.Command{
		Commands: []*cli.Command{
			serveApplicationCmd(cfg),
			databaseCmd(cfg),
			imagesCmd(cfg),
		},
	}
}
