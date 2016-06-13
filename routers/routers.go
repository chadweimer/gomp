package routers

import (
	"log"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/gorilla/context"
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

// HasError sends the request to the InternalServerError page
// if the asupplied error is not nil
func (rc *RouteController) HasError(resp http.ResponseWriter, req *http.Request, err error) bool {
	if err != nil {
		log.Println(err)
		rc.InternalServerError(resp, req, err)
		return true
	}
	return false
}

func (rc *RouteController) NoOp(resp http.ResponseWriter, req *http.Request) {
	// Do nothing
}

func (rc *RouteController) UserPopulater(resp http.ResponseWriter, req *http.Request, next http.HandlerFunc) {
	sess, err := rc.sessionStore.Get(req, "UserSession")
	if err != nil || sess.Values["UserID"] == nil {
		next(resp, req)
		return
	}

	var user *models.User
	if userID, ok := sess.Values["UserID"].(int64); ok {
		user, err = rc.model.Users.Read(userID)
	}
	if user != nil {
		rc.Context(req).Data["User"] = user
	}

	next(resp, req)
}

type Context struct {
	Data map[string]interface{}
}

func (rc *RouteController) Context(req *http.Request) *Context {
	c, ok := context.GetOk(req, "Context")
	if ok {
		ctx := c.(Context)
		return &ctx
	}

	ctx := Context{
		Data: make(map[string]interface{}),
	}
	context.Set(req, "Context", ctx)
	return &ctx
}
