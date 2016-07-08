package routers

import (
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/context"
	"github.com/julienschmidt/httprouter"
)

// Home handles rending the default home page
func (rc *RouteController) Home(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	ctx := context.Get(req)

	dinnerRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"dinner"}}, 1, 3)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["DinnerRecipes"] = dinnerRecipes

	rc.HTML(resp, http.StatusOK, "home", context.Get(req).Data)
}
