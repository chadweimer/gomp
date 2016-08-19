package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"time"

	"github.com/chadweimer/gomp/api"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/modules/upload"
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
		Layout: "shared/layout",
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
	n.Use(negroni.NewStatic(http.Dir("public")))

	if cfg.UploadDriver == "fs" {
		static := negroni.NewStatic(http.Dir(cfg.UploadPath))
		static.Prefix = "/uploads"
		n.Use(static)
	} else if cfg.UploadDriver == "s3" {
		s3Static := upload.NewS3Static(cfg)
		s3Static.Prefix = "/uploads"
		n.Use(s3Static)
	}

	n.Use(api.NewRouter(cfg, model))
	n.Use(newUIRouter(renderer))

	log.Printf("Starting server on port :%d", cfg.Port)
	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	graceful.Run(fmt.Sprintf(":%d", cfg.Port), timeout, n)

	// Make sure to close the database connection
	model.TearDown()
}
