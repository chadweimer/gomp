package routers

import (
	"net/http"

	"github.com/unrolled/render"
)

// Home handles rending the default home page
func Home(resp http.ResponseWriter, req *http.Request, r *render.Render) {
	r.HTML(resp, http.StatusOK, "home", make(map[string]interface{}))
}
