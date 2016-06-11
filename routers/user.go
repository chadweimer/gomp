package routers

import (
	"fmt"
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

		sess, err := rc.sessionStore.Get(req, "UserSession")
		if err != nil || sess.Values["UserID"] == nil {

			if loginPath := fmt.Sprintf("%s/login", rc.cfg.RootURLPath); req.URL.Path != loginPath {
				http.Redirect(resp, req, loginPath, http.StatusFound)
			}
			return
		}

		var user *models.User
		userID, ok := sess.Values["UserID"].(int64)
		if ok {
			user, err = rc.model.Users.Read(userID)
		}
		if user == nil {
			if logoutPath := fmt.Sprintf("%s/logout", rc.cfg.RootURLPath); req.URL.Path != logoutPath {
				http.Redirect(resp, req, logoutPath, http.StatusFound)
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
		rc.HTML(resp, http.StatusOK, "user/login", make(map[string]interface{}))
		return
	}

	sess, err := rc.sessionStore.New(req, "UserSession")
	if rc.HasError(resp, err) {
		return
	}
	sess.Values["UserID"] = user.ID
	err = sess.Save(req, resp)
	if rc.HasError(resp, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/", rc.cfg.RootURLPath), http.StatusFound)
}

func (rc *RouteController) Logout(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	sess, _ := rc.sessionStore.Get(req, "UserSession")
	if sess != nil {
		for k := range sess.Values {
			delete(sess.Values, k)
		}
		err := sess.Save(req, resp)
		if rc.HasError(resp, err) {
			return
		}
	}
	http.Redirect(resp, req, fmt.Sprintf("%s/login", rc.cfg.RootURLPath), http.StatusFound)
}
