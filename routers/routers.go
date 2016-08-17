package routers

import (
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"gopkg.in/unrolled/render.v1"
)

// RouteController encapsulates the routes for the application
type RouteController struct {
	*render.Render
	cfg   *conf.Config
	model *models.Model
}

// NewController constructs a RouteController
func NewController(render *render.Render, cfg *conf.Config, model *models.Model) *RouteController {
	return &RouteController{
		Render: render,
		cfg:    cfg,
		model:  model,
	}
}
