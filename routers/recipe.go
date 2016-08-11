package routers

import (
	"net/http"

	"github.com/chadweimer/gomp/modules/context"
	"github.com/julienschmidt/httprouter"
)

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
	data := context.Get(req).Data
	rc.HTML(resp, http.StatusOK, "recipe/edit", data)
}

// EditRecipe handles rendering the edit recipe screen
func (rc *RouteController) EditRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	data := context.Get(req).Data
	rc.HTML(resp, http.StatusOK, "recipe/edit", data)
}
