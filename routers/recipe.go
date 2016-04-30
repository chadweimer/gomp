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
	IngredientAmount []string
	IngredientUnit   []string
	IngredientName   []string
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

// CreateRecipe handles rendering the create recipe screen
func CreateRecipe(ctx *macaron.Context) {
	units, err := models.ListUnits()
	if err != nil {
		InternalServerError(ctx)
		return
	}
	ctx.Data["Units"] = units
	ctx.HTML(http.StatusOK, "recipe/create")
}

// CreateRecipePost handles processing the supplied
// form input from the create recipe screen
func CreateRecipePost(ctx *macaron.Context, form RecipeForm) {
	id, err := models.CreateRecipe(form.Name, form.Description, form.Directions, form.Tags)
	if err != nil {
		InternalServerError(ctx)
		return
	}
	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}

// EditRecipe handles rendering the edit recipe screen
func EditRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		InternalServerError(ctx)
		return
	}

	r, err := models.GetRecipeByID(id)
	if err != nil {
		InternalServerError(ctx)
		return
	}
	if r == nil {
		NotFound(ctx)
		return
	}

	units, err := models.ListUnits()
	if err != nil {
		InternalServerError(ctx)
		return
	}

	ctx.Data["Recipe"] = r
	ctx.Data["Units"] = units
	ctx.HTML(http.StatusOK, "recipe/edit")
}

// EditRecipePost handles processing the supplied
// form input from the edit recipe screen
func EditRecipePost(ctx *macaron.Context, form RecipeForm) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		InternalServerError(ctx)
		return
	}

	r, err := models.GetRecipeByID(id)
	if err != nil {
		InternalServerError(ctx)
		return
	}

	r.Name = form.Name
	r.Description = form.Description
	r.Directions = form.Directions
	r.Tags = form.Tags
	err = models.UpdateRecipe(r)
	if err != nil {
		InternalServerError(ctx)
		return
	}
	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}

// DeleteRecipe handles deleting the recipe with the given id
func DeleteRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		InternalServerError(ctx)
		return
	}

	err = models.DeleteRecipe(id)
	if err != nil {
		InternalServerError(ctx)
		return
	}

	ctx.Redirect("/recipes")
}
