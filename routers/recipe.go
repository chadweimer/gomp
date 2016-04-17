package routers

import (
	"gomp/models"
	"net/http"
	"strconv"

	"gopkg.in/macaron.v1"
)

// GetRecipe handles retrieving and rendering a single recipe
func GetRecipe(ctx *macaron.Context) {
	id, err := strconv.Atoi(ctx.Params("id"))
	if err != nil {
		InternalServerError(ctx)
		return
	}

	r, err := models.GetRecipeByID(id)
	switch {
		case err != nil:
			InternalServerError(ctx)
		case r == nil:
			NotFound(ctx)
		default:
			ctx.Data["Recipe"] = r
			ctx.HTML(http.StatusOK, "recipe")
	}
}

// ListRecipes handles retrieving and rending a list of available recipes
func ListRecipes(ctx *macaron.Context) {
	recipes, err := models.ListRecipes()
	if err != nil {
		InternalServerError(ctx)
		return
	}
	ctx.Data["Recipes"] = recipes
	ctx.HTML(http.StatusOK, "recipes")
}
