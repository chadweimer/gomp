package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/chadweimer/gomp/api"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/modules/context"
	"github.com/chadweimer/gomp/modules/upload"
	"github.com/chadweimer/gomp/routers"
	"github.com/julienschmidt/httprouter"
	"github.com/phyber/negroni-gzip/gzip"
	"github.com/urfave/negroni"
	"gopkg.in/tylerb/graceful.v1"
	"gopkg.in/unrolled/render.v1"
	"gopkg.in/unrolled/secure.v1"
)

func main() {
	cfg := conf.Load("conf/app.json")
	if err := cfg.Validate(); err != nil {
		log.Fatalf("[config] %s", err.Error())
	}
	model := models.New(cfg)
	renderer := render.New(render.Options{
		Layout: "shared/layout",
	})
	rc := routers.NewController(renderer, cfg, model)

	n := negroni.New()
	n.Use(negroni.NewRecovery())
	if cfg.IsDevelopment {
		n.Use(negroni.NewLogger())
	}
	n.Use(gzip.Gzip(gzip.DefaultCompression))

	// If specified, require HTTPS
	securitySettings := secure.Options{
		SSLRedirect:     cfg.RequireSSL,
		SSLProxyHeaders: map[string]string{"X-Forwarded-Proto": "https"},
		IsDevelopment:   cfg.IsDevelopment,
	}
	if cfg.RequireSSL {
		securitySettings.STSSeconds = 31536000
	}
	sm := secure.New(securitySettings)
	n.Use(negroni.HandlerFunc(sm.HandlerFuncWithNext))

	n.Use(negroni.NewStatic(http.Dir("public")))
	n.Use(context.NewContexter(cfg, model))
	n.Use(api.NewRouter(cfg, model))

	if cfg.UploadDriver == "fs" {
		static := negroni.NewStatic(http.Dir(cfg.UploadPath))
		static.Prefix = "/uploads"
		n.Use(static)
	} else if cfg.UploadDriver == "s3" {
		s3Static := upload.NewS3Static(cfg)
		s3Static.Prefix = "/uploads"
		n.Use(s3Static)
	}

	recipeMux := httprouter.New()
	recipeMux.GET("/", rc.Home)
	recipeMux.GET("/login", rc.Login)
	recipeMux.GET("/new", rc.CreateRecipe)
	recipeMux.GET("/recipes", rc.ListRecipes)
	recipeMux.GET("/recipes/:id", rc.GetRecipe)
	recipeMux.GET("/recipes/:id/edit", rc.EditRecipe)
	recipeMux.NotFound = http.HandlerFunc(rc.NotFound)
	n.UseHandler(recipeMux)

	log.Printf("Starting server on port :%d", cfg.Port)
	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	graceful.Run(fmt.Sprintf(":%d", cfg.Port), timeout, n)

	// Make sure to close the database connection
	model.TearDown()
}
