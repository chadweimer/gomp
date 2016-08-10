package routers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/context"
	"github.com/julienschmidt/httprouter"
	"github.com/mholt/binding"
)

// RecipeForm encapsulates user input on the Create and Edit recipe screens
type RecipeForm struct {
	Name          string   `form:"name"`
	ServingSize   string   `form:"serving-size"`
	NutritionInfo string   `form:"nutrition-info"`
	Ingredients   string   `form:"ingredients"`
	Directions    string   `form:"directions"`
	SourceURL     string   `form:"source"`
	Tags          []string `form:"tags"`
}

// FieldMap provides the RecipeForm field name maping for form binding
func (f *RecipeForm) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&f.Name:          "name",
		&f.ServingSize:   "serving-size",
		&f.NutritionInfo: "nutrition-info",
		&f.Ingredients:   "ingredients",
		&f.Directions:    "directions",
		&f.SourceURL:     "source",
		&f.Tags:          "tags",
	}
}

// GetRecipe handles retrieving and rendering a single recipe
func (rc *RouteController) GetRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	data := context.Get(req).Data
	rc.HTML(resp, http.StatusOK, "recipe/view", data)
}

// ListRecipes handles retrieving and rending a list of available recipes
func (rc *RouteController) ListRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	data := context.Get(req).Data
	rc.HTML(resp, http.StatusOK, "recipe/list", data)
}

// CreateRecipe handles rendering the create recipe screen
func (rc *RouteController) CreateRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	mostUsedTags, err := rc.model.Tags.ListMostUsed(12)
	if rc.HasError(resp, req, err) {
		return
	}

	data := context.Get(req).Data
	data["SuggestedTags"] = mostUsedTags
	rc.HTML(resp, http.StatusOK, "recipe/edit", data)
}

// CreateRecipePost handles processing the supplied form input from the create recipe screen
func (rc *RouteController) CreateRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(RecipeForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HasError(resp, req, errors.New(errs.Error()))
		return
	}

	recipe := &models.Recipe{
		Name:          form.Name,
		ServingSize:   form.ServingSize,
		NutritionInfo: form.NutritionInfo,
		Ingredients:   form.Ingredients,
		Directions:    form.Directions,
		SourceURL:     form.SourceURL,
		Tags:          form.Tags,
	}

	err := rc.model.Recipes.Create(recipe)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, recipe.ID), http.StatusFound)
}

// EditRecipe handles rendering the edit recipe screen
func (rc *RouteController) EditRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	recipe, err := rc.model.Recipes.Read(id)
	if err == models.ErrNotFound {
		rc.NotFound(resp, req)
		return
	}
	if rc.HasError(resp, req, err) {
		return
	}

	mostUsedTags, err := rc.model.Tags.ListMostUsed(12)
	if rc.HasError(resp, req, err) {
		return
	}

	data := context.Get(req).Data
	data["Recipe"] = recipe
	data["SuggestedTags"] = mostUsedTags
	rc.HTML(resp, http.StatusOK, "recipe/edit", data)
}

// EditRecipePost handles processing the supplied form input from the edit recipe screen
func (rc *RouteController) EditRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(RecipeForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HasError(resp, req, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	recipe := &models.Recipe{
		ID:            id,
		Name:          form.Name,
		ServingSize:   form.ServingSize,
		NutritionInfo: form.NutritionInfo,
		Ingredients:   form.Ingredients,
		Directions:    form.Directions,
		SourceURL:     form.SourceURL,
		Tags:          form.Tags,
	}

	err = rc.model.Recipes.Update(recipe)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}

// DeleteRecipe handles deleting the recipe with the given id
func (rc *RouteController) DeleteRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	err = rc.model.Recipes.Delete(id)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes", rc.cfg.RootURLPath), http.StatusFound)
}
