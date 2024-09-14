package main

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
	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/metadata"
	mw "github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/upload"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	// Start with a logger that defaults to the debug level, until we load configuration
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	})))

	// Write the app metadata to logs
	slog.
		With("version", metadata.BuildVersion).
		Info("Starting application")

	cfg := conf.Load(func(level slog.Level) *slog.Logger {
		return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: level,
		}))
	})
	if err := cfg.Validate(); err != nil {
		slog.
			With("error", err).
			Error("Configuration validation failed")
		return
	}

	fs := upload.OnlyFiles(os.DirFS(cfg.BaseAssetsPath))

	uplDriver, err := upload.CreateDriver(cfg.UploadDriver, cfg.UploadPath)
	if err != nil {
		slog.
			With("error", err).
			Error("Establishing upload driver failed")
		return
	}
	uploader := upload.CreateImageUploader(uplDriver, cfg.ToImageConfiguration())

	dbDriver, err := db.CreateDriver(
		cfg.DatabaseDriver, cfg.DatabaseUrl, cfg.MigrationsTableName, cfg.MigrationsForceVersion)
	if err != nil {
		slog.
			With("error", err).
			Error("Establishing database driver failed")
		return
	}
	defer dbDriver.Close()

	r := chi.NewRouter()

	// Intentionally register this before the logging middleware
	r.Use(middleware.Heartbeat("/ping"))

	// Add logging of all requests
	r.Use(middleware.RequestID)
	r.Use(mw.LogRequests(slog.Default()))

	// Don't let a panic bring the server down
	r.Use(middleware.Recoverer)

	// Don't let the extra slash cause problems
	r.Use(middleware.StripSlashes)

	r.Mount("/api", api.NewHandler(cfg.SecureKeys, uploader, dbDriver))
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.FS(fs))))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.FS(uplDriver))))
	r.NotFound(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(cfg.BaseAssetsPath, "index.html"))
	}))

	// subscribe to SIGINT signals
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	slog.With("port", cfg.Port).Info("Starting server")
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
	if err := srv.Shutdown(ctx); err != nil {
		// We're already going down. Time to panic
		panic(err)
	}
}
