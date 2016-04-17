package routers

import (
	"gomp/models"
	"net/http"
	"strconv"

	"gopkg.in/macaron.v1"
)

// Recipe handles retrieving and rendering a single recipe
func Recipe(ctx *macaron.Context) {
	id, err := strconv.Atoi(ctx.Params("id"))
	if err != nil {
		InternalServerError(ctx)
		return
	}

	r, err := models.GetRecipeByID(id)
	if r == nil {
		NotFound(ctx)
		return
	}
	ctx.Data["Recipe"] = r
	ctx.HTML(http.StatusOK, "recipe")
}

// Recipes handles retrieving and rending a list of available recipes
func Recipes(ctx *macaron.Context) {
	recipes := models.ListRecipes()
	ctx.Data["Recipes"] = recipes
	ctx.HTML(http.StatusOK, "recipes")
}
