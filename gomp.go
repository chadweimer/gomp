package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/chadweimer/gomp/cmds"
	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/vary/v2"
)

func main() {
	ctx := context.Background()

	// Start with a logger that defaults to the info level, until we load configuration
	var logLevel = new(slog.LevelVar)
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})))

	// Load configuration
	cfgBinder := vary.New(vary.WithLookup(
		vary.CompositeLookup(vary.PrefixedLookup("GOMP_", os.LookupEnv), os.LookupEnv),
	))
	cfg := config.Config{}
	if err := cfgBinder.Bind(&cfg); err != nil {
		slog.Error("Failed to load configuration. Exiting...", "error", err)
		os.Exit(1)
	}

	// Reconfigure the logger now that we've loaded the main application configuation
	logLevel.Set(cfg.LogLevel.Level)

	if err := cmds.RootCmd(cfg).Run(ctx, os.Args); err != nil {
		slog.Error("Failed to run command. Exiting...", "error", err)
		os.Exit(1)
	}
}
