package main

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/modules/upload"
	"github.com/julienschmidt/httprouter"
	"gopkg.in/unrolled/render.v1"
)

type uiHandler struct {
	cfg   *conf.Config
	uiMux *httprouter.Router
	*render.Render
}

func newUIHandler(cfg *conf.Config, renderer *render.Render) http.Handler {
	r := uiHandler{
		cfg:    cfg,
		Render: renderer,
	}

	r.uiMux = httprouter.New()
	r.uiMux.GET("/", r.home)
	r.uiMux.GET("/login", r.login)
	r.uiMux.GET("/new", r.createRecipe)
	r.uiMux.GET("/recipes", r.listRecipes)
	r.uiMux.GET("/recipes/:id", r.getRecipe)
	r.uiMux.GET("/recipes/:id/edit", r.editRecipe)
	if r.cfg.UploadDriver == "fs" {
		r.uiMux.ServeFiles("/uploads/*filepath", http.Dir(r.cfg.UploadPath))
	} else if r.cfg.UploadDriver == "s3" {
		r.uiMux.GET("/uploads/*filepath", upload.HandleS3Uploads(r.cfg.UploadPath))
	}
	r.uiMux.ServeFiles("/public/*filepath", http.Dir("public"))
	r.uiMux.NotFound = http.HandlerFunc(r.notFound)

	return r.uiMux
}

func (r uiHandler) login(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	r.HTML(resp, http.StatusOK, "user/login", nil)
}

func (r uiHandler) home(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	r.HTML(resp, http.StatusOK, "home", nil)
}

func (r uiHandler) getRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	r.HTML(resp, http.StatusOK, "recipe/view", nil)
}

func (r uiHandler) listRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	r.HTML(resp, http.StatusOK, "recipe/list", nil)
}

func (r uiHandler) createRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	r.HTML(resp, http.StatusOK, "recipe/edit", nil)
}

func (r uiHandler) editRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	r.HTML(resp, http.StatusOK, "recipe/edit", nil)
}

func (r uiHandler) notFound(resp http.ResponseWriter, req *http.Request) {
	r.showError(resp, http.StatusNotFound)
}

func (r uiHandler) showError(resp http.ResponseWriter, status int) {
	r.HTML(resp, status, fmt.Sprintf("status/%d", status), nil)
}
