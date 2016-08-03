package routers

import (
	"log"
	"net/http"
	"strconv"

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

func getStringParam(req *http.Request, sess *sessions.Session, name, defaultValue string) string {
	var val string
	vals, ok := req.URL.Query()[name]
	if ok && len(vals) > 0 {
		val = vals[0]
	} else if sessVal := sess.Values[name]; sessVal != nil {
		val = sessVal.(string)
	}
	if val == "" {
		val = defaultValue
	}

	return val
}

func getStringParams(req *http.Request, sess *sessions.Session, name string, defaultValue []string) []string {
	vals, ok := req.URL.Query()[name]
	if !ok || len(vals) == 0 {
		if sessVal := sess.Values[name]; sessVal != nil {
			vals = sessVal.([]string)
		}
	}
	// Trim out any empty values
	for i, val := range vals {
		if val == "" {
			vals = append(vals[:i], vals[i+1:]...)
		}
	}

	if len(vals) == 0 {
		vals = defaultValue
	}

	return vals
}

func getInt64Param(req *http.Request, sess *sessions.Session, name string, defaultValue, minValue, maxValue int64) int64 {
	var val int64
	vals, ok := req.URL.Query()[name]
	if ok && len(vals) > 0 {
		val, _ = strconv.ParseInt(vals[0], 10, 64)
	} else if sessVal := sess.Values[name]; sessVal != nil {
		val = sessVal.(int64)
	}
	if val < minValue || val > maxValue {
		val = defaultValue
	}

	return val
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
