package routers

import (
	"os"

	"gopkg.in/macaron.v1"
)

// CheckInstalled ensures the backend database is present
func CheckInstalled(ctx *macaron.Context) {
	if _, err := os.Stat("./data/gomp.db"); os.IsNotExist(err) {
		InternalServerError(ctx)
	}
}
