package routers

import (
	"net/http"

	"gopkg.in/macaron.v1"
)

func Install(ctx *macaron.Context) {
	ctx.HTML(http.StatusOK, "install")
}
