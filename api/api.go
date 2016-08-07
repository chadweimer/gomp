package api

import (
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/julienschmidt/httprouter"
)

type Router struct {
	cfg    *conf.Config
	model  *models.Model
	apiMux *httprouter.Router
}

func NewRouter(cfg *conf.Config, model *models.Model) Router {
	r := Router{
		cfg:   cfg,
		model: model,
	}

	r.apiMux = httprouter.New()
	r.apiMux.GET("/api/v1/recipes", r.GetRecipes)
	r.apiMux.NotFound = http.HandlerFunc(r.NoOp)

	return r
}

func (r Router) ServeHTTP(resp http.ResponseWriter, req *http.Request, next http.HandlerFunc) {
	handler, _, _ := r.apiMux.Lookup(req.Method, req.URL.Path)
	if handler != nil {
		resp.Header().Set("Content-Type", "application/json")
		r.apiMux.ServeHTTP(resp, req)
		return
	}
	next(resp, req)
}

func (ro Router) NoOp(resp http.ResponseWriter, req *http.Request) {
	// Do nothing
}
