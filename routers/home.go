package routers

import (
    "net/http"

    "gopkg.in/macaron.v1"
)

// Home handles rending the default home page
func Home(ctx *macaron.Context) {
    ctx.HTML(http.StatusOK, "home")
}
