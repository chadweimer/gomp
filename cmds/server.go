package cmds

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
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
		slog.Debug("Loaded configuration", "cfg", cfg)

		if err := cfg.Server.Validate(); err != nil {
			return fmt.Errorf("invalid server configuration: %w", err)
		}

		slog.Info("Starting server", "port", cfg.Server.Port, "version", metadata.BuildVersion)

		fsDriver, err := fileaccess.CreateDriver(cfg.FileAccess.Files)
		if err != nil {
			return fmt.Errorf("establishing file access driver: %w", err)
		}

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

		mux := createMux(
			cfg.Server.SecureKeys,
			uploader,
			dbDriver,
			fsDriver,
			baseAssetsRoot.FS(),
		)
		r := middleware.Wrap(
			mux,
			middleware.LogRequests(slog.Default(), cfg.Server.GetTrustedProxies()),
			middleware.Recover("Recovered from panic"),
		)

		// subscribe to SIGINT signals
		ctx, stop := signal.NotifyContext(ctx, syscall.SIGINT, syscall.SIGTERM)
		defer stop()

		srv := &http.Server{
			ReadHeaderTimeout: 10 * time.Second,
			Addr:              fmt.Sprintf(":%d", cfg.Server.Port),
			Handler:           r,
		}
		return listenAndServe(ctx, srv)
	}
}

func createMux(
	secureKeys []string,
	uploader *fileaccess.ImageUploader,
	dbDriver db.Driver,
	fsDriver fileaccess.Driver,
	assetsFS fs.FS) *http.ServeMux {
	handlePrefixed := func(mux *http.ServeMux, prefix string, handler http.Handler) {
		mux.Handle(fmt.Sprintf("/%s/", prefix), handler)
	}
	handlePrefixStripped := func(mux *http.ServeMux, prefix string, handler http.Handler) {
		handlePrefixed(mux, prefix, http.StripPrefix(fmt.Sprintf("/%s", prefix), handler))
	}

	fileServer := http.FileServerFS(fileaccess.OnlyFiles(fsDriver))

	mux := http.NewServeMux()
	handlePrefixStripped(mux, "api", api.NewHandler(secureKeys, uploader, dbDriver, fsDriver))
	handlePrefixStripped(mux, "static", http.FileServerFS(fileaccess.OnlyFiles(assetsFS)))
	// Uploaded files require authentication
	handlePrefixed(mux, fileaccess.UploadDirectoryName, middleware.VerifyScopes(
		[]string{string(models.Viewer)}, secureKeys, dbDriver.Users())(fileServer))
	// Backups require admin access
	handlePrefixed(mux, fileaccess.BackupDirectoryName, middleware.VerifyScopes(
		[]string{string(models.Admin)}, secureKeys, dbDriver.Users())(fileServer))
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFileFS(w, r, assetsFS, "index.html")
	}))
	return mux
}

func listenAndServe(ctx context.Context, srv httpServer) error {
	// Start server in background
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed", "error", err)
		}
	}()
	slog.Info("Server started")

	// Wait for context cancellation
	<-ctx.Done()
	slog.Info("Context cancelled, shutting down gracefully...")

	timeout := 10 * time.Second
	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), timeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Graceful shutdown failed", "error", err)
		// Force immediate close if timeout exceeded
		if closeErr := srv.Close(); closeErr != nil {
			slog.Error("Forced shutdown failed", "error", closeErr)
		}
		return err
	}

	slog.Info("Server shut down successfully")
	return nil
}

type httpServer interface {
	ListenAndServe() error
	Shutdown(ctx context.Context) error
	Close() error
}
