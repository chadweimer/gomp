package main

import (
	"context"
	"fmt"
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
	"github.com/chadweimer/gomp/upload"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/hlog"
	"github.com/rs/zerolog/log"
)

func main() {
	// Write logs to Stdout instead of Stderr
	zerolog.TimeFieldFormat = time.RFC3339Nano
	log.Logger = log.Output(zerolog.NewConsoleWriter(func(w *zerolog.ConsoleWriter) {
		w.TimeFormat = zerolog.TimeFieldFormat
	}))

	// Write the app metadata to logs
	log.Info().Str("version", metadata.BuildVersion).Msg("Starting application")

	cfg := conf.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatal().Err(err).Msg("Configuration validation failed")
		return
	}

	fs := upload.OnlyFiles(os.DirFS(cfg.BaseAssetsPath))
	upl, err := upload.CreateDriver(cfg.UploadDriver, cfg.UploadPath)
	if err != nil {
		log.Fatal().Err(err).Msg("Establishing upload driver failed")
		return
	}
	dbDriver, err := db.CreateDriver(
		cfg.DatabaseDriver, cfg.DatabaseUrl, cfg.MigrationsTableName, cfg.MigrationsForceVersion)
	if err != nil {
		log.Fatal().Err(err).Msg("Establishing database driver failed")
		return
	}
	defer dbDriver.Close()

	r := chi.NewRouter()

	// Intentionally register this before the logging middleware
	r.Use(middleware.Heartbeat("/ping"))

	// Add logging of all requests
	r.Use(middleware.RequestID)
	r.Use(hlog.NewHandler(log.Logger))
	r.Use(hlog.RequestIDHandler("req-id", ""))
	r.Use(hlog.AccessHandler(func(r *http.Request, status, size int, duration time.Duration) {
		hlog.FromRequest(r).Info().
			Int("bytes-written", size).
			Dur("duration", duration).
			Str("from", r.RemoteAddr).
			Str("method", r.Method).
			Str("referer", r.Referer()).
			Int("status", status).
			Str("url", r.URL.String()).
			Msg("")
	}))

	// Don't let a panic bring the server down
	r.Use(middleware.Recoverer)

	// Don't let the extra slash cause problems
	r.Use(middleware.StripSlashes)

	r.Mount("/api", api.NewHandler(cfg, upl, dbDriver))
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.FS(fs))))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.FS(upl))))
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

	log.Info().Int("port", cfg.Port).Msg("Starting server")
	srv := &http.Server{
		ReadHeaderTimeout: 10 * time.Second,
		Addr: fmt.Sprintf(":%d", cfg.Port),
		Handler: r,
	}
	go srv.ListenAndServe()

	// Wait for a stop signal
	<-stopChan
	log.Info().Msg("Shutting down server...")

	// Shutdown the http server
	if err := srv.Shutdown(ctx); err != nil {
		// We're already going down. Time to panic
		panic(err)
	}
}
