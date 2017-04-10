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
	"github.com/phyber/negroni-gzip/gzip"
	"github.com/urfave/negroni"
	"github.com/unrolled/render"
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
			"HomeTitle":        func() string { return cfg.HomeTitle },
			"HomeImage":        func() string { return cfg.HomeImage },
		}},
	})

	n := negroni.New()
	n.Use(negroni.NewRecovery())
	if cfg.IsDevelopment {
		n.Use(negroni.NewLogger())
	}
	n.Use(gzip.Gzip(gzip.DefaultCompression))

	apiHandler := api.NewHandler(renderer, cfg, model)
	staticHandler := newUIHandler(cfg, renderer)

	mainMux := http.NewServeMux()
	mainMux.Handle("/api/", apiHandler)
	mainMux.Handle("/static/", staticHandler)
	mainMux.Handle("/uploads/", staticHandler)
	mainMux.Handle("/", http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		renderer.HTML(resp, http.StatusOK, "index", nil)
	}))
	n.UseHandler(mainMux)

	// subscribe to SIGINT signals
	stopChan := make(chan os.Signal)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	log.Printf("Starting server on port :%d", cfg.Port)
	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	srv := &http.Server{Addr: fmt.Sprintf(":%d", cfg.Port), Handler: n}

	go func() {
		srv.ListenAndServe()
	}()

	<-stopChan
	log.Print("Shutting down server...")

	ctx,_ := context.WithTimeout(context.Background(), timeout)
	srv.Shutdown(ctx)

	// Make sure to close the database connection
	model.TearDown()
}
