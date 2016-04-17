package main

import (
	"gomp/routers"

	"gopkg.in/macaron.v1"
)

func main() {
	m := macaron.Classic()
	m.Use(macaron.Renderer())
	m.Use(macaron.Static("public"))

	m.Get("/", routers.Home)
	m.Group("/recipes", func() {
		m.Get("/", routers.Recipes)
		m.Get("/:id:int", routers.Recipe)
	})

	m.Run()
}
