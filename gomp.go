package main

import (
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/routers"
	"github.com/gorilla/context"
	"github.com/gorilla/sessions"
	"github.com/julienschmidt/httprouter"
	"github.com/urfave/negroni"
	"gopkg.in/unrolled/render.v1"
)

func main() {
	cfg := conf.Load("conf/app.json")
	model := models.New(cfg)
	sessionStore := sessions.NewCookieStore([]byte(cfg.SecretKey))
	renderer := render.New(render.Options{
		Layout: "shared/layout",
		Funcs: []template.FuncMap{map[string]interface{}{
			"ToLower":     strings.ToLower,
			"Add":         func(a, b int64) int64 { return a + b },
			"RootUrlPath": func() string { return cfg.RootURLPath },
			"Paginate": func(pageNum, numPages, num int64) []int64 {
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
			},
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
	recipeMux.POST("/recipes/:id/attach/create", rc.AttachToRecipePost)
	recipeMux.POST("/recipes/:id/note/create", rc.AddNoteToRecipePost)
	recipeMux.POST("/recipes/:id/rate", rc.RateRecipePost)
	recipeMux.NotFound = http.HandlerFunc(rc.NotFound)

	// Fall into the recipeMux only when the route isn't found in mainMux
	mainMux.NotFound = recipeMux

	n := negroni.New()
	n.Use(negroni.NewRecovery())
	if cfg.IsDevelopment {
		n.Use(negroni.NewLogger())
	}

	n.Use(&negroni.Static{Dir: http.Dir("public")})
	n.Use(&negroni.Static{Dir: http.Dir(fmt.Sprintf("%s/files", cfg.DataPath)), Prefix: "/files"})
	n.UseHandler(mainMux)

	http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), context.ClearHandler(n))
}
