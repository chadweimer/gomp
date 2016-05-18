package routers

import (
	"net/http"

	"github.com/unrolled/render"
	"gopkg.in/macaron.v1"
)

// Home handles rending the default home page
func Home(ctx *macaron.Context, r *render.Render) {
	r.HTML(ctx.Resp, http.StatusOK, "home", ctx.Data)
}
