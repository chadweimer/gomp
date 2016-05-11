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
			"Add": func(a, b int) int {
				return a + b
			},
		}}}))
	m.Use(macaron.Static("data/files", macaron.StaticOptions{Prefix: "files"}))

	m.Get("/", routers.ListRecipes)
	m.Group("/recipes", func() {
		m.Get("/", routers.ListRecipes)
		m.Get("/create", routers.CreateRecipe)
		m.Post("/create", binding.Bind(routers.RecipeForm{}), routers.CreateRecipePost)
		m.Group("/:id:int", func() {
			m.Get("/", routers.GetRecipe)
			m.Get("/edit", routers.EditRecipe)
			m.Post("/edit", binding.Bind(routers.RecipeForm{}), routers.EditRecipePost)
			m.Get("/delete", routers.DeleteRecipe)
			m.Post("/attach/create", binding.Bind(routers.AttachmentForm{}), routers.AttachToRecipePost)
			m.Post("/note/create", binding.Bind(routers.NoteForm{}), routers.AddNoteToRecipePost)
		})
	})

	m.Run()
}
