package main

import (
	"context"
	"fmt"
	"log"
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
)

func main() {
	// Write logs to Stdout instead of Stderr
	log.SetOutput(os.Stdout)

	// Write the app metadata to logs
	log.Printf("Starting application: BuildVersion=%s", metadata.BuildVersion)

	var err error
	cfg := conf.Load()
	if err = cfg.Validate(); err != nil {
		log.Fatalf("[config] %s", err.Error())
	}
	fs := upload.NewJustFilesFileSystem(http.Dir(cfg.BaseAssetsPath))
	upl := upload.CreateDriver(cfg.UploadDriver, cfg.UploadPath)
	dbDriver := db.CreateDriver(
		cfg.DatabaseDriver, cfg.DatabaseURL, cfg.MigrationsTableName, cfg.MigrationsForceVersion)
	defer dbDriver.Close()

	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	if cfg.IsDevelopment {
		r.Use(middleware.Logger)
	}
	r.Use(middleware.StripSlashes)

	r.Mount("/api", api.NewHandler(cfg, upl, dbDriver))
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(fs)))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(upl)))
	r.NotFound(http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		http.ServeFile(resp, req, filepath.Join(cfg.BaseAssetsPath, "index.html"))
	}))

	// subscribe to SIGINT signals
	stopChan := make(chan os.Signal)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	log.Printf("Starting server on port :%d", cfg.Port)
	srv := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: r}
	go srv.ListenAndServe()

	// Wait for a stop signal
	<-stopChan
	log.Print("Shutting down server...")

	// Shutdown the http server
	srv.Shutdown(ctx)
}
