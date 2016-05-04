package routers

import (
	"fmt"
	"os"

	"gopkg.in/macaron.v1"
)

// CheckInstalled ensures the backend database is present
func CheckInstalled(ctx *macaron.Context) {
	if _, err := os.Stat("./data/gomp.db"); os.IsNotExist(err) {
		// TODO: Redirect to a more specific error page
		InternalServerError(ctx, err)
	}
}

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
