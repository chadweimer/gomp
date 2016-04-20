package routers

import (
    "os"

    "gopkg.in/macaron.v1"
)

func CheckInstalled(ctx *macaron.Context) {
    if _, err := os.Stat("./data/gomp.db"); os.IsNotExist(err) {
        ctx.Redirect("/install")
    }
}
