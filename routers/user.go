package routers

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (rc *RouteController) RequireAuthentication(h httprouter.Handle) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		http.Redirect(resp, req, fmt.Sprintf("%s/login", rc.cfg.RootURLPath), http.StatusFound)
	}
}

func (rc *RouteController) Login(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "user/login", make(map[string]interface{}))
}
