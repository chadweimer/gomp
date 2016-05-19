package routers

import (
	"net/http"
)

// Home handles rending the default home page
func (rc *RouteController) Home(resp http.ResponseWriter, req *http.Request) {
	rc.HTML(resp, http.StatusOK, "home", make(map[string]interface{}))
}
