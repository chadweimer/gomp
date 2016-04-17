package main

import (
	"gomp/routers"

	"gopkg.in/macaron.v1"
)

func main() {
	m := macaron.Classic()
	m.Use(macaron.Renderer())
	m.Use(macaron.Static("public"))

	// TODO: Redirect to install page if this is first run

	m.Get("/", routers.Home)
	m.Get("/install", routers.Install)
	m.Group("/recipes", func() {
		m.Get("/", routers.ListRecipes)
		m.Get("/:id:int", routers.GetRecipe)
	})
	//m.Group("/meals", func() {
	//	m.Get("/", routers.Meal)
	//	m.Get(/:id:int, routers.Meals)
	//})

	m.Run()
}
