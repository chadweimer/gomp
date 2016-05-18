package main

import (
	"fmt"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/routers"
	"gopkg.in/macaron.v1"
)

func main() {
	m := macaron.Classic()
	m.Use(macaron.Static(fmt.Sprintf("%s/files", conf.DataPath()), macaron.StaticOptions{
		Prefix: "files",
	}))

	m.Get("/", routers.ListRecipes)
	m.Group("/recipes", func() {
		m.Get("/", routers.ListRecipes)
		m.Get("/create", routers.CreateRecipe)
		m.Post("/create", routers.CreateRecipePost)
		m.Group("/:id:int", func() {
			m.Get("/", routers.GetRecipe)
			m.Get("/edit", routers.EditRecipe)
			m.Post("/edit", routers.EditRecipePost)
			m.Get("/delete", routers.DeleteRecipe)
			m.Post("/attach/create", routers.AttachToRecipePost)
			m.Post("/note/create", routers.AddNoteToRecipePost)
		})
	})

	m.NotFound(routers.NotFound)

	m.Run("0.0.0.0", conf.Port())
}
