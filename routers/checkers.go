package routers

import (
	"fmt"
	"net/http"

	"github.com/unrolled/render"
)

// RedirectIfHasError sends the request to the InternalServerError page
// if the asupplied error is not nil
func RedirectIfHasError(resp http.ResponseWriter, r *render.Render, err error) bool {
	if err != nil {
		fmt.Println(err)
		InternalServerError(resp, r, err)
		return true
	}
	return false
}
