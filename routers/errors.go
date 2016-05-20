package routers

import (
	"fmt"
	"net/http"
)

// NotFound handles 404 errors
func (rc *RouteController) NotFound(resp http.ResponseWriter, req *http.Request) {
	rc.showError(resp, http.StatusNotFound, make(map[string]interface{}))
}

// InternalServerError handles 500 errors
func (rc *RouteController) InternalServerError(resp http.ResponseWriter, err error) {
	data := map[string]interface{}{
		"Error": err,
	}
	rc.showError(resp, http.StatusInternalServerError, data)
}

func (rc *RouteController) showError(resp http.ResponseWriter, status int, data map[string]interface{}) {
	rc.HTML(resp, status, fmt.Sprintf("status/%d", status), data)
}
