package routers

import (
	"net/http"

	"github.com/chadweimer/gomp/modules/context"
	"github.com/julienschmidt/httprouter"
)

// Home handles rending the default home page
func (rc *RouteController) Home(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	ctx := context.Get(req)

	ctx.Data["HomeTitle"] = rc.cfg.HomeTitle
	ctx.Data["HomeImage"] = rc.cfg.HomeImage
	rc.HTML(resp, http.StatusOK, "home", context.Get(req).Data)
}
