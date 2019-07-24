package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/chadweimer/gomp/api"
	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/pkg/router"
	"github.com/chadweimer/gomp/upload"
	"github.com/unrolled/render"
	"github.com/urfave/negroni"
)

func main() {
	cfg := conf.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("[config] %s", err.Error())
	}
	upl := upload.CreateDriver(cfg.UploadDriver, cfg.UploadPath)
	model := models.New(cfg, upl)
	renderer := render.New(render.Options{
		IsDevelopment: cfg.IsDevelopment,
		IndentJSON:    true,
	})

	n := negroni.New()
	n.Use(negroni.NewRecovery())
	if cfg.IsDevelopment {
		n.Use(negroni.NewLogger())
	}

	mainMux := router.New()

	// Add the static routes
	mainMux.ServeFiles("/static/*filepath", upload.NewJustFilesFileSystem(http.Dir("static")))
	mainMux.ServeFiles("/uploads/*filepath", upl)
	mainMux.NotFound = http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		http.ServeFile(resp, req, "static/index.html")
	})

	// Add the API routes
	apiGroup := mainMux.NewGroup("/api")
	apiHandler := api.New(renderer, cfg, upl, model)
	apiHandler.AddRoutes(apiGroup)

	n.UseHandler(mainMux)

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
	srv := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: n}
	go srv.ListenAndServe()

	// Wait for a stop signal
	<-stopChan
	log.Print("Shutting down server...")

	// Shutdown the http server and close the database connection
	srv.Shutdown(ctx)
	model.TearDown()
}
