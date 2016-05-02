package routers

import (
	"os"
	"fmt"

	"gopkg.in/macaron.v1"
)

// CheckInstalled ensures the backend database is present
func CheckInstalled(ctx *macaron.Context) {
	if _, err := os.Stat("./data/gomp.db"); os.IsNotExist(err) {
		// TODO: Redirect to a more specific error page
		InternalServerError(ctx, err)
	}
}

func RedirectIfHasError(ctx *macaron.Context, err error) bool {
	if err != nil {
		fmt.Println(err)
		InternalServerError(ctx, err)
		return true
	}
	return false
}
