package main

import (
	"fmt"
	"html/template"
	"strings"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/routers"
	"github.com/go-macaron/binding"
	"github.com/unrolled/render"
	"gopkg.in/macaron.v1"
)

func main() {
	m := macaron.Classic()
	m.Map(render.New(render.Options{
		Layout: "shared/layout",
		Funcs: []template.FuncMap{map[string]interface{}{
			"ToLower": strings.ToLower,
			"Add": func(a, b int) int {
				return a + b
			},
			"RootUrlPath": conf.RootURLPath,
		}}}))
	m.Use(macaron.Static(fmt.Sprintf("%s/files", conf.DataPath()), macaron.StaticOptions{
		Prefix: "files",
	}))

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

	m.NotFound(routers.NotFound)

	m.Run("0.0.0.0", conf.Port())
}
