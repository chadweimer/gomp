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
	"github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/upload"
)

func main() {
	// Start with a logger that defaults to the info level, until we load configuration
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	// Write the app metadata to logs
	slog.Info("Starting application", "version", metadata.BuildVersion)

	cfg := conf.Load(func(cfg *conf.Config) {
		level := slog.LevelInfo
		if cfg.IsDevelopment {
			level = slog.LevelDebug
		}
		slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: level,
		})))
	})
	if err := cfg.Validate(); err != nil {
		slog.Error("Configuration validation failed", "error", err)
		return
	}

	fs := upload.OnlyFiles(os.DirFS(cfg.BaseAssetsPath))

	uplDriver, err := upload.CreateDriver(cfg.UploadDriver, cfg.UploadPath)
	if err != nil {
		slog.Error("Establishing upload driver failed", "error", err)
		return
	}
	uploader := upload.CreateImageUploader(uplDriver, cfg.ToImageConfiguration())

	dbDriver, err := db.CreateDriver(
		cfg.DatabaseDriver, cfg.DatabaseUrl, cfg.MigrationsTableName, cfg.MigrationsForceVersion)
	if err != nil {
		slog.Error("Establishing database driver failed", "error", err)
		return
	}
	defer dbDriver.Close()

	mux := http.NewServeMux()
	mux.Handle("/api/*", http.StripPrefix("/api", api.NewHandler(cfg.SecureKeys, uploader, dbDriver)))
	mux.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.FS(fs))))
	mux.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.FS(uplDriver))))
	mux.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(cfg.BaseAssetsPath, "index.html"))
	}))

	r := middleware.Wrap(
		mux,
		middleware.LogRequests(slog.Default()),
		middleware.Recover("Recovered from panic"),
	)

	// subscribe to SIGINT signals
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
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
	if err := srv.Shutdown(ctx); err != nil {
		// We're already going down. Time to panic
		panic(err)
	}
}
