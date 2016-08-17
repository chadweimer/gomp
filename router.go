package main

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/julienschmidt/httprouter"
	"gopkg.in/unrolled/render.v1"
)

// Router encapsulates the routes for the application
type Router struct {
	*render.Render
	cfg   *conf.Config
	model *models.Model
}

// NewRouter constructs a Router
func NewRouter(render *render.Render, cfg *conf.Config, model *models.Model) *Router {
	return &Router{
		Render: render,
		cfg:    cfg,
		model:  model,
	}
}

// Login handles rendering the login page
func (rc *Router) Login(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "user/login", nil)
}

// Home handles rending the default home page
func (rc *Router) Home(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "home", nil)
}

// GetRecipe handles retrieving and rendering a single recipe
func (rc *Router) GetRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "recipe/view", nil)
}

// ListRecipes handles retrieving and rending a list of available recipes
func (rc *Router) ListRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "recipe/list", nil)
}

// CreateRecipe handles rendering the create recipe screen
func (rc *Router) CreateRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "recipe/edit", nil)
}

// EditRecipe handles rendering the edit recipe screen
func (rc *Router) EditRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "recipe/edit", nil)
}

// NotFound handles 404 errors
func (rc *Router) NotFound(resp http.ResponseWriter, req *http.Request) {
	rc.showError(resp, http.StatusNotFound, nil)
}

func (rc *Router) showError(resp http.ResponseWriter, status int, data map[string]interface{}) {
	rc.HTML(resp, status, fmt.Sprintf("status/%d", status), nil)
}
