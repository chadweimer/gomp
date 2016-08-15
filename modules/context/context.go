package context

import (
	"log"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/gorilla/context"
	"github.com/gorilla/sessions"
)

// Contexter handles managing application-wide context information.
type Contexter struct {
	cfg          *conf.Config
	model        *models.Model
	sessionStore sessions.Store
}

// NewContexter constructs a new instance of Contexter.
func NewContexter(cfg *conf.Config, model *models.Model, sessionStore sessions.Store) *Contexter {
	return &Contexter{
		cfg:          cfg,
		model:        model,
		sessionStore: sessionStore}
}

func (c Contexter) ServeHTTP(resp http.ResponseWriter, req *http.Request, next http.HandlerFunc) {
	defer context.Clear(req)

	c.addUserToContext(resp, req)

	next(resp, req)
}

func (c Contexter) addUserToContext(resp http.ResponseWriter, req *http.Request) {
	sess, err := c.sessionStore.Get(req, "UserSession")
	if err != nil {
		log.Printf("[contexter] addUserToContext failed: %s", err.Error())
		return
	} else if sess.Values["UserID"] == nil {
		return
	}

	var user *models.User
	if userID, ok := sess.Values["UserID"].(int64); ok {
		user, err = c.model.Users.Read(userID)
		if err != nil {
			log.Printf("[contexter] addUserToContext failed: %s", err.Error())
		}
	}

	data := Get(req).Data
	data["UrlPath"] = req.URL.Path
	data["ApplicationTitle"] = c.cfg.ApplicationTitle
	if user != nil {
		data["User"] = user
	}
}

// RequestContext represents the context data for a single request.
type RequestContext struct {
	Data map[string]interface{}
}

// Get returns the RequestContext for the specified request object, creating a new one if necessary.
func Get(req *http.Request) *RequestContext {
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
