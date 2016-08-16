package routers

import (
	"net/http"

	"github.com/chadweimer/gomp/modules/context"
	"github.com/julienschmidt/httprouter"
)

func (rc *RouteController) Login(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "user/login", context.Get(req).Data)
}
