package routers

import (
	"fmt"
	"net/http"
)

// NotFound handles 404 errors
func (rc *RouteController) NotFound(resp http.ResponseWriter, req *http.Request) {
	rc.showError(resp, http.StatusNotFound, rc.Context(req).Data)
}

// InternalServerError handles 500 errors
func (rc *RouteController) InternalServerError(resp http.ResponseWriter, req *http.Request, err error) {
	data := rc.Context(req).Data
	data["Error"] = err
	rc.showError(resp, http.StatusInternalServerError, data)
}

func (rc *RouteController) showError(resp http.ResponseWriter, status int, data map[string]interface{}) {
	rc.HTML(resp, status, fmt.Sprintf("status/%d", status), data)
}
