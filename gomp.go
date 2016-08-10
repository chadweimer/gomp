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
	"github.com/chadweimer/gomp/modules/context"
	"github.com/chadweimer/gomp/modules/upload"
	"github.com/chadweimer/gomp/routers"
	"github.com/gorilla/sessions"
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
	sessionStore := sessions.NewCookieStore([]byte(cfg.SecretKey))
	sessionStore.Options.Secure = !cfg.IsDevelopment && cfg.RequireSSL
	renderer := render.New(render.Options{
		Layout: "shared/layout",
		Funcs: []template.FuncMap{map[string]interface{}{
			"RootUrlPath":      func() string { return cfg.RootURLPath },
			"ApplicationTitle": func() string { return cfg.ApplicationTitle },
			"Add":              func(a, b int64) int64 { return a + b },
			"Paginate":         getPageNumbersForPagination,
			"StrSliceContains": func(theSlice []string, searchFor string) bool {
				for _, value := range theSlice {
					if value == searchFor {
						return true
					}
				}
				return false
			},
		}}})
	rc := routers.NewController(renderer, cfg, model, sessionStore)

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
	n.Use(context.NewContexter(cfg, model, sessionStore))

	n.Use(api.NewRouter(cfg, model))

	authMux := httprouter.New()
	authMux.GET("/login", rc.Login)
	authMux.POST("/login", rc.LoginPost)
	authMux.GET("/logout", rc.Logout)
	// Do nothing if this route isn't matched. Let the later handlers/routes get processed
	authMux.NotFound = http.HandlerFunc(rc.NoOp)
	n.UseHandler(authMux)

	// !!!! IMPORTANT !!!!
	// Everything before this is valid with or without authentication.
	// Everything after this requires authentication

	if cfg.UploadDriver == "fs" {
		static := negroni.NewStatic(http.Dir(cfg.UploadPath))
		static.Prefix = "/uploads"
		n.UseFunc(rc.RequireAuthentication(static))
	} else if cfg.UploadDriver == "s3" {
		s3Static := upload.NewS3Static(cfg)
		s3Static.Prefix = "/uploads"
		n.UseFunc(rc.RequireAuthentication(s3Static))
	}

	recipeMux := httprouter.New()
	recipeMux.GET("/", rc.Home)
	recipeMux.GET("/new", rc.CreateRecipe)
	recipeMux.GET("/recipes", rc.ListRecipes)
	recipeMux.POST("/recipes", rc.CreateRecipePost)
	recipeMux.GET("/recipes/:id", rc.GetRecipe)
	recipeMux.GET("/recipes/:id/edit", rc.EditRecipe)
	recipeMux.POST("/recipes/:id", rc.EditRecipePost)
	recipeMux.GET("/recipes/:id/delete", rc.DeleteRecipe)
	recipeMux.NotFound = http.HandlerFunc(rc.NotFound)
	n.UseFunc(rc.RequireAuthentication(negroni.Wrap(recipeMux)))

	log.Printf("Starting server on port :%d", cfg.Port)
	timeout := 10 * time.Second
	if cfg.IsDevelopment {
		timeout = 1 * time.Second
	}
	graceful.Run(fmt.Sprintf(":%d", cfg.Port), timeout, n)

	// Make sure to close the database connection
	model.TearDown()
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
