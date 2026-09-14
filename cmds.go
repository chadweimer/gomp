package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/chadweimer/gomp/api"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/models"
	"github.com/urfave/cli/v3"
)

var rootCmd = &cli.Command{
	Commands: []*cli.Command{
		{
			Name:   "serve",
			Usage:  "Serve the application",
			Action: serverApplication,
		},
		{
			Name:  "db",
			Usage: "Database related commands",
			Commands: []*cli.Command{
				{
					Name:  "migrate",
					Usage: "Run database migrations",
					Commands: []*cli.Command{
						{
							Name:   "up",
							Usage:  "Apply all up migrations",
							Action: migrateDatabaseUp,
						},
						{
							Name:   "down",
							Usage:  "Apply all down migrations",
							Action: migrateDatabaseDown,
						},
					},
				},
			},
		},
		{
			Name:  "images",
			Usage: "Image related commands",
			Commands: []*cli.Command{
				{
					Name:   "optimize",
					Usage:  "Optimize images",
					Action: nil,
				},
			},
		},
	},
}

func serverApplication(ctx context.Context, _ *cli.Command) error {
	cfg, ok := ConfigFromContext(ctx)
	if !ok {
		return errors.New("failed to retrieve configuration from context")
	}

	fsDriver, err := fileaccess.CreateDriver(cfg.FileAccess.Files)
	if err != nil {
		return fmt.Errorf("establishing file access driver: %w", err)
	}
	fileServer := http.FileServerFS(fileaccess.OnlyFiles(fsDriver))

	uploader, err := fileaccess.CreateImageUploader(fsDriver, cfg.FileAccess.Image)
	if err != nil {
		return fmt.Errorf("establishing uploader: %w", err)
	}

	dbDriver, err := db.CreateDriver(cfg.Database)
	if err != nil {
		return fmt.Errorf("establishing database driver: %w", err)
	}
	defer dbDriver.Close()

	baseAssetsRoot, err := os.OpenRoot(cfg.BaseAssetsPath)
	if err != nil {
		return fmt.Errorf("opening base assets path: %w", err)
	}

	handlePrefixed := func(mux *http.ServeMux, prefix string, handler http.Handler) {
		mux.Handle(fmt.Sprintf("/%s/", prefix), handler)
	}
	handlePrefixStripped := func(mux *http.ServeMux, prefix string, handler http.Handler) {
		handlePrefixed(mux, prefix, http.StripPrefix(fmt.Sprintf("/%s", prefix), handler))
	}

	mux := http.NewServeMux()
	handlePrefixStripped(mux, "api", api.NewHandler(cfg.SecureKeys, uploader, dbDriver, fsDriver))
	handlePrefixStripped(mux, "static", http.FileServerFS(fileaccess.OnlyFiles(baseAssetsRoot.FS())))
	// Uploaded files require authentication
	handlePrefixed(mux, fileaccess.UploadDirectoryName, middleware.VerifyScopes(
		[]string{string(models.Viewer)}, cfg.SecureKeys, dbDriver.Users())(fileServer))
	// Backups require admin access
	handlePrefixed(mux, fileaccess.BackupDirectoryName, middleware.VerifyScopes(
		[]string{string(models.Admin)}, cfg.SecureKeys, dbDriver.Users())(fileServer))
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(cfg.BaseAssetsPath, "index.html"))
	}))

	r := middleware.Wrap(
		mux,
		middleware.LogRequests(slog.Default(), cfg.getTrustedProxies()),
		middleware.Recover("Recovered from panic"),
	)

	// subscribe to SIGINT signals
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	timeout := 10 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	slog.Info("Starting server", "port", cfg.Port)
	srv := &http.Server{
		ReadHeaderTimeout: 10 * time.Second,
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           r,
	}
	go srv.ListenAndServe()

	// Wait for a stop signal
	<-stopChan
	slog.Info("Shutting down server...")

	// Shutdown the http server
	return srv.Shutdown(ctx)
}

func migrateDatabaseUp(ctx context.Context, _ *cli.Command) error {
	slog.Info("Migrating database up")
	cfg, ok := ConfigFromContext(ctx)
	if !ok {
		return errors.New("failed to retrieve configuration from context")
	}

	dbDriver, err := db.CreateDriver(cfg.Database)
	if err != nil {
		return fmt.Errorf("establishing database driver: %w", err)
	}
	defer dbDriver.Close()

	return dbDriver.MigrateUp()
}

func migrateDatabaseDown(ctx context.Context, _ *cli.Command) error {
	cfg, ok := ConfigFromContext(ctx)
	if !ok {
		return errors.New("failed to retrieve configuration from context")
	}

	dbDriver, err := db.CreateDriver(cfg.Database)
	if err != nil {
		return fmt.Errorf("establishing database driver: %w", err)
	}
	defer dbDriver.Close()

	return dbDriver.MigrateDown()
}
