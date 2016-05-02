package routers

import (
	"fmt"
	"gomp/models"
	"net/http"
	"strconv"

	"gopkg.in/macaron.v1"
)

// RecipeForm encapsulates user input on the Create and Edit recipe screens
type RecipeForm struct {
	Name             string `binding:"Required"`
	Description      string
	Directions       string
	Tags             []string
	IngredientAmount []string `form:"ingredient_amount"`
	IngredientUnit   []int64  `form:"ingredient_unit"`
	IngredientName   []string `form:"ingredient_name"`
}

// GetRecipe handles retrieving and rendering a single recipe
func GetRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	recipe, err := models.GetRecipeByID(id)
	if RedirectIfHasError(ctx, err) {
		return
	}
	if recipe == nil {
		NotFound(ctx)
		return
	}

	ctx.Data["Recipe"] = recipe
	ctx.HTML(http.StatusOK, "recipe/view")
}

// ListRecipes handles retrieving and rending a list of available recipes
func ListRecipes(ctx *macaron.Context) {
	recipes, err := models.ListRecipes()
	if RedirectIfHasError(ctx, err) {
		return
	}
	ctx.Data["Recipes"] = recipes
	ctx.HTML(http.StatusOK, "recipe/list")
}

// CreateRecipe handles rendering the create recipe screen
func CreateRecipe(ctx *macaron.Context) {
	units, err := models.ListUnits()
	if RedirectIfHasError(ctx, err) {
		return
	}
	ctx.Data["Units"] = units
	ctx.HTML(http.StatusOK, "recipe/create")
}

// CreateRecipePost handles processing the supplied
// form input from the create recipe screen
func CreateRecipePost(ctx *macaron.Context, form RecipeForm) {
	id, err := models.CreateRecipe(
		form.Name,
		form.Description,
		form.Directions,
		form.Tags,
		form.IngredientAmount,
		form.IngredientUnit,
		form.IngredientName)
	if RedirectIfHasError(ctx, err) {
		return
	}
	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}

// EditRecipe handles rendering the edit recipe screen
func EditRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	recipe, err := models.GetRecipeByID(id)
	if RedirectIfHasError(ctx, err) {
		return
	}
	if recipe == nil {
		NotFound(ctx)
		return
	}

	units, err := models.ListUnits()
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Data["Recipe"] = recipe
	ctx.Data["Units"] = units
	ctx.HTML(http.StatusOK, "recipe/edit")
}

// EditRecipePost handles processing the supplied
// form input from the edit recipe screen
func EditRecipePost(ctx *macaron.Context, form RecipeForm) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	err = models.UpdateRecipe(
		id,
		form.Name,
		form.Description,
		form.Directions,
		form.Tags,
		form.IngredientAmount,
		form.IngredientUnit,
		form.IngredientName)
	if RedirectIfHasError(ctx, err) {
		return
	}
	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}

// DeleteRecipe handles deleting the recipe with the given id
func DeleteRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	err = models.DeleteRecipe(id)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Redirect("/recipes")
}
