package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/chadweimer/gomp/api"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/phyber/negroni-gzip/gzip"
	"github.com/urfave/negroni"
	"gopkg.in/tylerb/graceful.v1"
	"gopkg.in/unrolled/render.v1"
)

func main() {
	logger := log.New(os.Stdout, "[gomp] ", 0)

	cfg := conf.Load()
	model := models.New(cfg)
	renderer := render.New(render.Options{
		Layout: "shared/layout",
		Funcs: []template.FuncMap{map[string]interface{}{
			"ApplicationTitle": func() string { return cfg.ApplicationTitle },
			"HomeTitle":        func() string { return cfg.HomeTitle },
			"HomeImage":        func() string { return cfg.HomeImage },
		}},
	})

	n := negroni.New()
	if cfg.IsDevelopment {
		n.Use(negroni.NewLogger())
	}
	n.Use(gzip.Gzip(gzip.DefaultCompression))

	mainMux := http.NewServeMux()
	mainMux.Handle("/api/", api.NewHandler(cfg, model))
	mainMux.Handle("/", newUIHandler(cfg, renderer))
	n.UseHandler(mainMux)

	logger.Printf("Starting server on port :%d", cfg.Port)
	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	graceful.Run(fmt.Sprintf(":%d", cfg.Port), timeout, n)

	// Make sure to close the database connection
	model.TearDown()
}
