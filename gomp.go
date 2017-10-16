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
	"github.com/chadweimer/gomp/modules/upload"
	"github.com/julienschmidt/httprouter"
	"github.com/unrolled/render"
	"github.com/urfave/negroni"
)

func main() {
	cfg := conf.Load("conf/app.json")
	if err := cfg.Validate(); err != nil {
		log.Fatalf("[config] %s", err.Error())
	}
	upl := upload.CreateDriver(cfg.UploadDriver, cfg.UploadPath)
	model := models.New(cfg, upl)
	renderer := render.New(render.Options{
		IsDevelopment: cfg.IsDevelopment,
		IndentJSON:    true,
		Directory:     "static",

		Funcs: []template.FuncMap{map[string]interface{}{
			"ApplicationTitle": func() string { return cfg.ApplicationTitle },
		}},
	})

	n := negroni.New()
	n.Use(negroni.NewRecovery())
	if cfg.IsDevelopment {
		n.Use(negroni.NewLogger())
	}

	apiHandler := api.NewHandler(renderer, cfg, upl, model)

	mainMux := httprouter.New()
	mainMux.Handler("GET", "/api/*apipath", apiHandler)
	mainMux.Handler("PUT", "/api/*apipath", apiHandler)
	mainMux.Handler("POST", "/api/*apipath", apiHandler)
	mainMux.Handler("DELETE", "/api/*apipath", apiHandler)
	mainMux.ServeFiles("/static/*filepath", upload.NewJustFilesFileSystem(http.Dir("static")))
	mainMux.ServeFiles("/uploads/*filepath", upl)
	mainMux.NotFound = http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		renderer.HTML(resp, http.StatusOK, "index", nil)
	})
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
