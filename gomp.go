package main

import (
    "gomp/routers"

    "github.com/go-macaron/binding"
    "gopkg.in/macaron.v1"
)

func main() {
    m := macaron.Classic()
    m.Use(macaron.Renderer())
    m.Use(macaron.Static("public"))

    m.Get("/", routers.CheckInstalled, routers.Home)
    m.Group("/recipes", func() {
        m.Get("/", routers.ListRecipes)
        m.Get("/:id:int", routers.GetRecipe)
        m.Get("/create", routers.CreateRecipe)
        m.Post("/create", binding.Bind(routers.RecipeForm{}), routers.CreateRecipePost)
        m.Get("/edit/:id:int", routers.EditRecipe)
        m.Post("/edit/:id:int", binding.Bind(routers.RecipeForm{}), routers.EditRecipePost)
    }, routers.CheckInstalled)
    //m.Group("/meals", func() {
    //  m.Get("/", routers.Meal)
    //  m.Get(/:id:int, routers.Meals)
    //}, routers.CheckInstalled)
    m.Get("/install", routers.Install)

    m.Run()
}
