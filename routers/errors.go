package routers

import (
	"fmt"
	"net/http"
)

// NotFound handles 404 errors
func NotFound(resp http.ResponseWriter, req *http.Request) {
	showError(resp, http.StatusNotFound, make(map[string]interface{}))
}

// InternalServerError handles 500 errors
func InternalServerError(resp http.ResponseWriter, err error) {
	data := map[string]interface{}{
		"Error": err,
	}
	showError(resp, http.StatusInternalServerError, data)
}

func showError(resp http.ResponseWriter, status int, data map[string]interface{}) {
	rend.HTML(resp, status, fmt.Sprintf("status/%d", status), data)
}
