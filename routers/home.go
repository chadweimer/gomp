package routers

import (
	"net/http"
)

// Home handles rending the default home page
func Home(resp http.ResponseWriter, req *http.Request) {
	rend.HTML(resp, http.StatusOK, "home", make(map[string]interface{}))
}
