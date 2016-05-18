package routers

import (
	"fmt"
	"net/http"

	"github.com/unrolled/render"
)

// NotFound handles 404 errors
func NotFound(resp http.ResponseWriter, r *render.Render) {
	showError(resp, r, http.StatusNotFound, make(map[string]interface{}))
}

// InternalServerError handles 500 errors
func InternalServerError(resp http.ResponseWriter, r *render.Render, err error) {
	data := map[string]interface{}{
		"Error": err,
	}
	showError(resp, r, http.StatusInternalServerError, data)
}

func showError(resp http.ResponseWriter, r *render.Render, status int, data map[string]interface{}) {
	r.HTML(resp, status, fmt.Sprintf("status/%d", status), data)
}
