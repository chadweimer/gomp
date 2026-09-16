package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/chadweimer/gomp/cmds"
	"github.com/chadweimer/gomp/config"
)

func main() {
	// Start with a logger that defaults to the info level, until we load configuration
	var logLevel = new(slog.LevelVar)
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})))

	cfg, err := config.Load()
	if err != nil {
		slog.Error(fmt.Sprintf("%s", err))
		os.Exit(2)
	}

	// Reconfigure the logger now that we've loaded the configuation
	logLevel.Set(cfg.LogLevel.Level)

	if err := cmds.RootCmd(cfg).Run(context.Background(), os.Args); err != nil {
		slog.Error(fmt.Sprintf("%s", err))
		os.Exit(1)
	}
}
