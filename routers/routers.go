package routers

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/gorilla/sessions"
	"gopkg.in/unrolled/render.v1"
)

// RouteController encapsulates the routes for the application
type RouteController struct {
	*render.Render
	cfg          *conf.Config
	model        *models.Model
	sessionStore sessions.Store
}

// NewController constructs a RouteController
func NewController(render *render.Render, cfg *conf.Config, model *models.Model, sessionStore sessions.Store) *RouteController {
	return &RouteController{
		Render:       render,
		cfg:          cfg,
		model:        model,
		sessionStore: sessionStore,
	}
}

// RedirectIfHasError sends the request to the InternalServerError page
// if the asupplied error is not nil
func (rc *RouteController) RedirectIfHasError(resp http.ResponseWriter, err error) bool {
	if err != nil {
		fmt.Println(err)
		rc.InternalServerError(resp, err)
		return true
	}
	return false
}
