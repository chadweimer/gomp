package context

import (
	"log"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/gorilla/context"
	"github.com/gorilla/sessions"
)

type Contexter struct {
	cfg          *conf.Config
	model        *models.Model
	sessionStore sessions.Store
}

func NewContexter(cfg *conf.Config, model *models.Model, sessionStore sessions.Store) Contexter {
	return Contexter{
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
		log.Printf("[AppContexter] addUserToContext failed: %s", err.Error())
		return
	} else if sess.Values["UserID"] == nil {
		return
	}

	var user *models.User
	if userID, ok := sess.Values["UserID"].(int64); ok {
		user, err = c.model.Users.Read(userID)
		if err != nil {
			log.Printf("[AppContexter] addUserToContext failed: %s", err.Error())
		}
	}
	if user != nil {
		Get(req).Data["User"] = user
	}
}

type RequestContext struct {
	Data map[string]interface{}
}

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
