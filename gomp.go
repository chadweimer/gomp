package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/modules/upload"
	"github.com/chadweimer/gomp/routers"
	"github.com/gorilla/context"
	"github.com/gorilla/sessions"
	"github.com/julienschmidt/httprouter"
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
	sessionStore := sessions.NewCookieStore([]byte(cfg.SecretKey))
	renderer := render.New(render.Options{
		Layout: "shared/layout",
		Funcs: []template.FuncMap{map[string]interface{}{
			"RootUrlPath":      func() string { return cfg.RootURLPath },
			"ApplicationTitle": func() string { return cfg.ApplicationTitle },

			"ToLower":     strings.ToLower,
			"QueryEscape": url.QueryEscape,
			"Add":         func(a, b int64) int64 { return a + b },
			"TimeEqual":   func(a, b time.Time) bool { return a == b },
			"Paginate":    getPageNumbersForPagination,
		}}})
	rc := routers.NewController(renderer, cfg, model, sessionStore)

	// Since httprouter explicitly doesn't allow /path/to and /path/:match,
	// we get a little fancy and use 2 mux'es to emulate/force the behavior
	mainMux := httprouter.New()
	mainMux.GET("/", rc.ListRecipes)
	mainMux.GET("/recipes", rc.ListRecipes)
	mainMux.GET("/recipes/create", rc.CreateRecipe)
	mainMux.POST("/recipes/create", rc.CreateRecipePost)

	// Use the recipeMux to configure the routes related to a single recipe,
	// since /recipes/:id conflicts with /recipes/create above
	recipeMux := httprouter.New()
	recipeMux.GET("/recipes/:id", rc.GetRecipe)
	recipeMux.GET("/recipes/:id/edit", rc.EditRecipe)
	recipeMux.POST("/recipes/:id/edit", rc.EditRecipePost)
	recipeMux.GET("/recipes/:id/delete", rc.DeleteRecipe)
	recipeMux.POST("/recipes/:id/attach", rc.CreateAttachmentPost)
	recipeMux.GET("/recipes/:id/attach/:name/delete", rc.DeleteAttachment)
	recipeMux.POST("/recipes/:id/note", rc.CreateNotePost)
	recipeMux.POST("/recipes/:id/note/:note_id", rc.EditNotePost)
	recipeMux.GET("/recipes/:id/note/:note_id/delete", rc.DeleteNote)
	recipeMux.POST("/recipes/:id/rate", rc.RateRecipePost)
	recipeMux.NotFound = http.HandlerFunc(rc.NotFound)

	// Fall into the recipeMux only when the route isn't found in mainMux
	mainMux.NotFound = recipeMux

	n := negroni.New()
	n.Use(negroni.NewRecovery())
	if cfg.IsDevelopment {
		n.Use(negroni.NewLogger())
	}
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
	n.UseHandler(context.ClearHandler(mainMux))

	log.Printf("Starting server on port :%d", cfg.Port)
	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	graceful.Run(fmt.Sprintf(":%d", cfg.Port), timeout, n)
}

func getPageNumbersForPagination(pageNum, numPages, num int64) []int64 {
	if numPages == 0 {
		return []int64{1}
	}

	if numPages < num {
		num = numPages
	}

	startPage := pageNum - num/2
	endPage := pageNum + num/2
	if startPage < 1 {
		startPage = 1
		endPage = startPage + num - 1
	} else if endPage > numPages {
		endPage = numPages
		startPage = endPage - num + 1
	}

	pageNums := make([]int64, num, num)
	for i := int64(0); i < num; i++ {
		pageNums[i] = i + startPage
	}
	return pageNums
}
