package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/vary/v2"
)

func main() {
	ctx := context.Background()

	// Start with a logger that defaults to the info level, until we load configuration
	var logLevel = new(slog.LevelVar)
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})))

	// Write the app metadata to logs
	slog.Info("Starting application", "version", metadata.BuildVersion)

	// Load configuration
	cfgBinder := vary.New(vary.WithLookup(
		vary.CompositeLookup(vary.PrefixedLookup("GOMP_", os.LookupEnv), os.LookupEnv),
	))
	cfg := &Config{}
	if err := cfgBinder.Bind(cfg); err != nil {
		slog.Error("Failed to load configuration. Exiting...", "error", err)
		os.Exit(1)
	}

	// Reconfigure the logger now that we've loaded the main application configuation
	logLevel.Set(cfg.LogLevel.Level)

	// Now it's OK to log what was loaded
	slog.Debug("Loaded application configuration", "cfg", cfg)

	if err := cfg.validate(); err != nil {
		slog.Error("Invalid configuration. Exiting...", "error", err)
		os.Exit(1)
	}

	ctx = cfg.AddToContext(ctx)

	if err := rootCmd.Run(ctx, os.Args); err != nil {
		slog.Error("Failed to run root command. Exiting...", "error", err)
		os.Exit(1)
	}
}
