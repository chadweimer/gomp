package cmds

import (
	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/gomp/metadata"
	"github.com/urfave/cli/v3"
)

// RootCmd returns the root CLI command for the application.
func RootCmd(cfg config.Config) *cli.Command {
	return &cli.Command{
		Usage:           "Command-line interface for the application",
		HideHelpCommand: true,
		Version:         metadata.BuildVersion,
		Copyright:       metadata.Copyright,
		Commands: []*cli.Command{
			serveApplicationCmd(cfg),
			databaseCmd(cfg),
			imagesCmd(cfg),
			docsCmd(cfg),
		},
	}
}
