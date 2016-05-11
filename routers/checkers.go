package routers

import (
	"fmt"

	"gopkg.in/macaron.v1"
)

// RedirectIfHasError sends the request to the InternalServerError page
// if the asupplied error is not nil
func RedirectIfHasError(ctx *macaron.Context, err error) bool {
	if err != nil {
		fmt.Println(err)
		InternalServerError(ctx, err)
		return true
	}
	return false
}
