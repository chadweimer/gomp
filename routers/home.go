package routers

import (
	"net/http"

	"github.com/chadweimer/gomp/modules/context"
)

// Home handles rending the default home page
func (rc *RouteController) Home(resp http.ResponseWriter, req *http.Request) {
	rc.HTML(resp, http.StatusOK, "home", context.Get(req).Data)
}
