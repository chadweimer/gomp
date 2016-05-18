package routers

import (
	"fmt"
	"net/http"

	"github.com/unrolled/render"
	"gopkg.in/macaron.v1"
)

// NotFound handles 404 errors
func NotFound(ctx *macaron.Context, r *render.Render) {
	showError(ctx, r, http.StatusNotFound)
}

// InternalServerError handles 500 errors
func InternalServerError(ctx *macaron.Context, r *render.Render, err error) {
	ctx.Data["Error"] = err
	showError(ctx, r, http.StatusInternalServerError)
}

func showError(ctx *macaron.Context, r *render.Render, status int) {
	r.HTML(ctx.Resp, status, fmt.Sprintf("status/%d", status), ctx.Data)
}
