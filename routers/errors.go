package routers

import (
	"fmt"
	"net/http"

	"gopkg.in/macaron.v1"
)

// NotFound handles 404 errors
func NotFound(ctx *macaron.Context) {
	showError(ctx, http.StatusNotFound)
}

// InternalServerError handles 500 errors
func InternalServerError(ctx *macaron.Context) {
	showError(ctx, http.StatusInternalServerError)
}

func showError(ctx *macaron.Context, status int) {
	ctx.HTML(status, fmt.Sprintf("status/%d", status))
}
