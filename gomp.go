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
	cfg := conf.Load("conf/app.json")
	if err := cfg.Validate(); err != nil {
		log.Fatalf("[config] %s", err.Error())
	}
	model := models.New(cfg)
	renderer := render.New(render.Options{
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

	apiHandler := api.NewHandler(cfg, model)
	staticHandler := newUIHandler(cfg, renderer)

	mainMux := http.NewServeMux()
	mainMux.Handle("/api/", apiHandler)
	mainMux.Handle("/static/", staticHandler)
	mainMux.Handle("/uploads/", staticHandler)
	mainMux.Handle("/", http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		var filePath = fmt.Sprintf("build/bundled%s", req.URL.Path)
		if stat, err := os.Stat(filePath); os.IsNotExist(err) || stat.IsDir() {
			renderer.HTML(resp, http.StatusOK, "index", nil)
		} else {
			http.ServeFile(resp, req, filePath)
		}
	}))
	n.UseHandler(mainMux)

	log.Printf("Starting server on port :%d", cfg.Port)
	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	graceful.Run(fmt.Sprintf(":%d", cfg.Port), timeout, n)

	// Make sure to close the database connection
	model.TearDown()
}
