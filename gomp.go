package main

import (
	"gomp/routers"
	"html/template"
	"strings"

	"github.com/go-macaron/binding"
	"gopkg.in/macaron.v1"
)

func main() {
	m := macaron.Classic()
	m.Use(macaron.Renderer(macaron.RenderOptions{
		Funcs: []template.FuncMap{map[string]interface{}{
			"ToLower": strings.ToLower,
		}}}))
	m.Use(macaron.Static("public"))

	m.Get("/", routers.CheckInstalled, routers.Home)
	m.Group("/recipes", func() {
		m.Get("/", routers.ListRecipes)
		m.Get("/:id:int", routers.GetRecipe)
		m.Get("/create", routers.CreateRecipe)
		m.Post("/create", binding.Bind(routers.RecipeForm{}), routers.CreateRecipePost)
		m.Get("/edit/:id:int", routers.EditRecipe)
		m.Post("/edit/:id:int", binding.Bind(routers.RecipeForm{}), routers.EditRecipePost)
		m.Get("/delete/:id:int", routers.DeleteRecipe)
	}, routers.CheckInstalled)

	m.Run()
}
