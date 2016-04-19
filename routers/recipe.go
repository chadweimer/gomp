package routers

import (
	"fmt"
	"gomp/models"
	"net/http"
	"strconv"

	"gopkg.in/macaron.v1"
)

type RecipeForm struct {
	Name string `binding:"Required"`
	Description string
}

// GetRecipe handles retrieving and rendering a single recipe
func GetRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
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
			ctx.HTML(http.StatusOK, "recipe/view")
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
	ctx.HTML(http.StatusOK, "recipe/list")
}

func CreateRecipe(ctx *macaron.Context) {
	ctx.HTML(http.StatusOK, "recipe/create")
}

func CreateRecipePost(ctx *macaron.Context, form RecipeForm) {
	recipe, err := models.CreateRecipe(form.Name, form.Description)
	if err != nil {

	}
	ctx.Redirect(fmt.Sprintf("/recipes/%d", recipe.ID))
}
