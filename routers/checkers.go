package routers

import (
	"fmt"

	"github.com/unrolled/render"
	"gopkg.in/macaron.v1"
)

// RedirectIfHasError sends the request to the InternalServerError page
// if the asupplied error is not nil
func RedirectIfHasError(ctx *macaron.Context, r *render.Render, err error) bool {
	if err != nil {
		fmt.Println(err)
		InternalServerError(ctx, r, err)
		return true
	}
	return false
}
