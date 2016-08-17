package main

import (
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/gorilla/context"
)

// Contexter handles managing application-wide context information.
type Contexter struct {
	cfg   *conf.Config
	model *models.Model
}

// NewContexter constructs a new instance of Contexter.
func NewContexter(cfg *conf.Config, model *models.Model) *Contexter {
	return &Contexter{
		cfg:   cfg,
		model: model,
	}
}

func (c Contexter) ServeHTTP(resp http.ResponseWriter, req *http.Request, next http.HandlerFunc) {
	defer context.Clear(req)

	data := GetContext(req).Data
	data["UrlPath"] = req.URL.Path
	data["ApplicationTitle"] = c.cfg.ApplicationTitle
	next(resp, req)
}

// RequestContext represents the context data for a single request.
type RequestContext struct {
	Data map[string]interface{}
}

// GetContext returns the RequestContext for the specified request object, creating a new one if necessary.
func GetContext(req *http.Request) *RequestContext {
	c, ok := context.GetOk(req, "Context")
	if ok {
		ctx := c.(RequestContext)
		return &ctx
	}

	ctx := RequestContext{
		Data: make(map[string]interface{}),
	}
	context.Set(req, "Context", ctx)
	return &ctx
}
