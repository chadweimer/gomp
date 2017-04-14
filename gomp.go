package main

import (
	"context"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/chadweimer/gomp/api"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/unrolled/render"
	"github.com/urfave/negroni"
)

func main() {
	cfg := conf.Load("conf/app.json")
	if err := cfg.Validate(); err != nil {
		log.Fatalf("[config] %s", err.Error())
	}
	model := models.New(cfg)
	renderer := render.New(render.Options{
		IndentJSON: true,

		Funcs: []template.FuncMap{map[string]interface{}{
			"ApplicationTitle": func() string { return cfg.ApplicationTitle },
			"HomeImage":        func() string { return cfg.HomeImage },
		}},
	})

	n := negroni.New()
	n.Use(negroni.NewRecovery())
	if cfg.IsDevelopment {
		n.Use(negroni.NewLogger())
	}
	//n.Use(gzip.Gzip(gzip.DefaultCompression))

	apiHandler := api.NewHandler(renderer, cfg, model)
	staticHandler := newUIHandler(cfg, renderer)

	mainMux := http.NewServeMux()
	mainMux.Handle("/api/", apiHandler)
	//mainMux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(justFilesFileSystem{http.Dir("static")})))
	//mainMux.Handle("/uploads/", http.StripPrefix("/uploads/", upload.HandleS3Uploads2(cfg.UploadPath)))
	mainMux.Handle("/static/", staticHandler)
	mainMux.Handle("/uploads/", staticHandler)
	mainMux.Handle("/", http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		renderer.HTML(resp, http.StatusOK, "index", nil)
	}))
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
