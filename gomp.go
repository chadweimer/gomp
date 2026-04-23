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
	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/gomp/middleware"
)

func main() {
	// Start with a logger that defaults to the info level, until we load configuration
	var logLevel = new(slog.LevelVar)
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})))

	// Write the app metadata to logs
	slog.Info("Starting application", "version", metadata.BuildVersion)

	// Load configuration
	cfg := &Config{}
	if err := conf.Bind(cfg); err != nil {
		slog.Error("Failed to load configuration. Exiting...", "error", err)
		os.Exit(1)
	}

	// Reconfigure the logger now that we've loaded the main application configuation
	if cfg.IsDevelopment {
		logLevel.Set(slog.LevelDebug)
	}

	// Now it's OK to log what was loaded
	slog.Debug("Loaded application configuration", "cfg", cfg)

	if err := cfg.validate(); err != nil {
		slog.Error("Invalid configuration. Exiting...", "error", err)
		os.Exit(1)
	}

	fsDriver, err := fileaccess.CreateDriver(cfg.FileAccess.Files)
	if err != nil {
		slog.Error("Establishing file access driver failed. Exiting...", "error", err)
		os.Exit(1)
	}
	fileServer := http.FileServerFS(fileaccess.OnlyFiles(fsDriver))

	uploader, err := fileaccess.CreateImageUploader(fsDriver, cfg.FileAccess.Image)
	if err != nil {
		slog.Error("Establishing uploader failed. Exiting...", "error", err)
		os.Exit(1)
	}

	dbDriver, err := db.CreateDriver(cfg.Database)
	if err != nil {
		slog.Error("Establishing database driver failed. Exiting...", "error", err)
		os.Exit(1)
	}
	defer dbDriver.Close()

	baseAssetsRoot, err := os.OpenRoot(cfg.BaseAssetsPath)
	if err != nil {
		slog.Error("Opening base assets path failed. Exiting...", "error", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	handlePrefixStripped(mux, "api", api.NewHandler(cfg.SecureKeys, uploader, dbDriver, fsDriver))
	handlePrefixStripped(mux, "static", http.FileServerFS(fileaccess.OnlyFiles(baseAssetsRoot.FS())))
	handlePrefixed(mux, fileaccess.UploadDirectoryName, fileServer)
	handlePrefixed(mux, fileaccess.BackupDirectoryName, fileServer)
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

func handlePrefixed(mux *http.ServeMux, prefix string, handler http.Handler) {
	mux.Handle(fmt.Sprintf("/%s/", prefix), handler)
}

func handlePrefixStripped(mux *http.ServeMux, prefix string, handler http.Handler) {
	handlePrefixed(mux, prefix, http.StripPrefix(fmt.Sprintf("/%s", prefix), handler))
}
