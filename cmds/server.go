package cmds

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/chadweimer/gomp/api"
	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/models"
	"github.com/urfave/cli/v3"
)

func serveApplicationCmd(cfg config.Config) *cli.Command {
	return &cli.Command{
		Name:   "serve",
		Usage:  "Serve the application",
		Action: serveApplication(cfg),
	}
}

func serveApplication(cfg config.Config) func(ctx context.Context, _ *cli.Command) error {
	return func(ctx context.Context, _ *cli.Command) error {
		slog.Info("Starting server", "version", metadata.BuildVersion)
		slog.Debug("Loaded configuration", "cfg", cfg)

		if err := cfg.Server.Validate(); err != nil {
			return fmt.Errorf("invalid server configuration: %w", err)
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

		baseAssetsRoot, err := os.OpenRoot(cfg.Server.BaseAssetsPath)
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
		handlePrefixStripped(mux, "api", api.NewHandler(cfg.Server.SecureKeys, uploader, dbDriver, fsDriver))
		handlePrefixStripped(mux, "static", http.FileServerFS(fileaccess.OnlyFiles(baseAssetsRoot.FS())))
		// Uploaded files require authentication
		handlePrefixed(mux, fileaccess.UploadDirectoryName, middleware.VerifyScopes(
			[]string{string(models.Viewer)}, cfg.Server.SecureKeys, dbDriver.Users())(fileServer))
		// Backups require admin access
		handlePrefixed(mux, fileaccess.BackupDirectoryName, middleware.VerifyScopes(
			[]string{string(models.Admin)}, cfg.Server.SecureKeys, dbDriver.Users())(fileServer))
		mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, filepath.Join(cfg.Server.BaseAssetsPath, "index.html"))
		}))

		r := middleware.Wrap(
			mux,
			middleware.LogRequests(slog.Default(), cfg.Server.GetTrustedProxies()),
			middleware.Recover("Recovered from panic"),
		)

		// subscribe to SIGINT signals
		stopChan := make(chan os.Signal, 1)
		signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

		timeout := 10 * time.Second
		ctx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()

		slog.Info("Starting server", "port", cfg.Server.Port)
		srv := &http.Server{
			ReadHeaderTimeout: 10 * time.Second,
			Addr:              fmt.Sprintf(":%d", cfg.Server.Port),
			Handler:           r,
		}
		go srv.ListenAndServe()

		// Wait for a stop signal
		<-stopChan
		slog.Info("Shutting down server...")

		// Shutdown the http server
		return srv.Shutdown(ctx)
	}
}
