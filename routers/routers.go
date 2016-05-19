package routers

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"gopkg.in/unrolled/render.v1"
)

type RouteController struct {
	*render.Render
	Cfg   *conf.Config
	Model *models.Model
}

// RedirectIfHasError sends the request to the InternalServerError page
// if the asupplied error is not nil
func (rc *RouteController) RedirectIfHasError(resp http.ResponseWriter, err error) bool {
	if err != nil {
		fmt.Println(err)
		rc.InternalServerError(resp, err)
		return true
	}
	return false
}
