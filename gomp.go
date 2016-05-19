package main

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/routers"
	"github.com/julienschmidt/httprouter"
	"gopkg.in/codegangsta/negroni.v0"
)

func main() {
	// Since httprouter explicitly doesn't allow /path/to and /path/:match,
	// we get a little fancy and use 2 mux'es to emulate/force the behavior
	mainMux := httprouter.New()
	mainMux.GET("/", routers.ListRecipes)
	mainMux.GET("/recipes", routers.ListRecipes)
	mainMux.GET("/recipes/create", routers.CreateRecipe)
	mainMux.POST("/recipes/create", routers.CreateRecipePost)

	// Use the recipeMux to configure the routes related to a single recipe,
	// since /recipes/:id conflicts with /recipes/create above
	recipeMux := httprouter.New()
	recipeMux.GET("/recipes/:id", routers.GetRecipe)
	recipeMux.GET("/recipes/:id/edit", routers.EditRecipe)
	recipeMux.POST("/recipes/:id/edit", routers.EditRecipePost)
	recipeMux.GET("/recipes/:id/delete", routers.DeleteRecipe)
	recipeMux.POST("/recipes/:id/attach/create", routers.AttachToRecipePost)
	recipeMux.POST("/recipes/:id/note/create", routers.AddNoteToRecipePost)
	recipeMux.NotFound = http.HandlerFunc(routers.NotFound)

	// Fall into the recipeMux only when the route isn't found in mainMux
	mainMux.NotFound = recipeMux

	n := negroni.Classic()
	files := negroni.NewStatic(http.Dir(fmt.Sprintf("%s/files", conf.DataPath())))
	files.Prefix = "/files"
	n.Use(files)
	n.UseHandler(mainMux)

	n.Run(fmt.Sprintf(":%d", conf.Port()))
}
