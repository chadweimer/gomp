package routers

import (
	"fmt"
	"log"
	"net/http"

	"github.com/chadweimer/gomp/modules/context"
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
		user := context.Get(req).Data["User"]
		if user == nil {
			if loginPath := fmt.Sprintf("%s/login", rc.cfg.RootURLPath); req.URL.Path != loginPath {
				http.Redirect(resp, req, loginPath, http.StatusFound)
			}
			return
		}

		h.ServeHTTP(resp, req, next)
	}
}

func (rc *RouteController) Login(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	if context.Get(req).Data["User"] != nil {
		http.Redirect(resp, req, fmt.Sprintf("%s/", rc.cfg.RootURLPath), http.StatusFound)
	}

	rc.HTML(resp, http.StatusOK, "user/login", context.Get(req).Data)
}

func (rc *RouteController) LoginPost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(LoginForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HTML(resp, http.StatusOK, "user/login", context.Get(req).Data)
		return
	}

	user, err := rc.model.Users.Authenticate(form.Username, form.Password)
	if err != nil {
		rc.HTML(resp, http.StatusOK, "user/login", context.Get(req).Data)
		return
	}

	sess, err := rc.sessionStore.New(req, "UserSession")
	if err != nil {
		if sess == nil {
			rc.InternalServerError(resp, req, err)
			return
		}

		log.Print("[login] Invalid session retrieved.")
	}
	sess.Values["UserID"] = user.ID
	err = sess.Save(req, resp)
	if rc.HasError(resp, req, err) {
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
		if rc.HasError(resp, req, err) {
			return
		}
	}
	http.Redirect(resp, req, fmt.Sprintf("%s/login", rc.cfg.RootURLPath), http.StatusFound)
}
