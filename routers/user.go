package routers

import (
	"fmt"
	"log"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
	"github.com/mholt/binding"
	"github.com/urfave/negroni"
)

// LoginForm encapsulates user input for the login screen
type LoginForm struct {
	Username string `form:"username"`
	Password string `form:"password"`
}

// FieldMap provides the LoginForm field name maping for form binding
func (f *LoginForm) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&f.Username: "username",
		&f.Password: "password",
	}
}

func (rc *RouteController) RequireAuthentication(h negroni.Handler) negroni.HandlerFunc {
	return func(resp http.ResponseWriter, req *http.Request, next http.HandlerFunc) {
		loginPath := fmt.Sprintf("%s/login", rc.cfg.RootURLPath)

		sess, err := rc.sessionStore.Get(req, "UserSession")
		if err != nil || sess.Values["UserID"] == nil {
			if req.URL.Path != loginPath {
				http.Redirect(resp, req, fmt.Sprintf("%s/login", rc.cfg.RootURLPath), http.StatusFound)
			}
			return
		}

		var user *models.User
		userID, ok := sess.Values["UserID"].(int64)
		if ok {
			user, err = rc.model.Users.Read(userID)
		}
		if user == nil {
			delete(sess.Values, "UserID")
			sess.Save(req, resp)
			if req.URL.Path != loginPath {
				http.Redirect(resp, req, fmt.Sprintf("%s/login", rc.cfg.RootURLPath), http.StatusFound)
			}
			return
		}

		h.ServeHTTP(resp, req, next)
	}
}

func (rc *RouteController) Login(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "user/login", make(map[string]interface{}))
}

func (rc *RouteController) LoginPost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(LoginForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HTML(resp, http.StatusOK, "user/login", make(map[string]interface{}))
		return
	}

	user, err := rc.model.Users.Authenticate(form.Username, form.Password)
	if err != nil {
		log.Printf("[authenticate] %s", err.Error())
		rc.HTML(resp, http.StatusOK, "user/login", make(map[string]interface{}))
		return
	}

	// TODO: Create a session with a reasonable expiration
	sess, err := rc.sessionStore.Get(req, "UserSession")
	if err != nil {
		log.Print("Invalid user session retrieved. Will use a new one...")
	}
	sess.Values["UserID"] = user.ID
	sess.Save(req, resp)

	http.Redirect(resp, req, fmt.Sprintf("%s/", rc.cfg.RootURLPath), http.StatusFound)
}

func (rc *RouteController) Logout(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	sess, _ := rc.sessionStore.Get(req, "UserSession")
	if sess != nil {
		for k := range sess.Values {
			delete(sess.Values, k)
		}
		sess.Save(req, resp)
	}
	http.Redirect(resp, req, fmt.Sprintf("%s/login", rc.cfg.RootURLPath), http.StatusFound)
}
