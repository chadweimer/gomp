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
	"github.com/chadweimer/gomp/upload"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/unrolled/render"
)

func main() {
	var err error
	cfg := conf.Load()
	if err = cfg.Validate(); err != nil {
		log.Fatalf("[config] %s", err.Error())
	}
	fs := upload.NewJustFilesFileSystem(http.Dir(cfg.BaseAssetsPath))
	upl := upload.CreateDriver(cfg.UploadDriver, cfg.UploadPath)
	renderer := render.New(render.Options{
		IsDevelopment: cfg.IsDevelopment,
		IndentJSON:    true,
	})
	dbDriver := db.CreateDriver(
		cfg.DatabaseDriver, cfg.DatabaseURL, cfg.MigrationsTableName, cfg.MigrationsForceVersion)

	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	if cfg.IsDevelopment {
		r.Use(middleware.Logger)
	}

	apiHandler := api.NewHandler(renderer, cfg, upl, dbDriver)

	r.Mount("/api/v1", apiHandler)

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

	// Shutdown the http server and close the database connection
	srv.Shutdown(ctx)
	dbDriver.Close()
}
