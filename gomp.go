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
		m.Get("/:id:int/edit", routers.EditRecipe)
		m.Post("/:id:int/edit", binding.Bind(routers.RecipeForm{}), routers.EditRecipePost)
		m.Get("/:id:int/delete", routers.DeleteRecipe)
		m.Post("/:id:int/attach/create", binding.Bind(routers.AttachmentForm{}), routers.AttachToRecipePost)
		m.Post("/:id:int/note/create", binding.Bind(routers.NoteForm{}), routers.AddNoteToRecipePost)
	}, routers.CheckInstalled)

	m.Run()
}
