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

	dinnerRecipes, dinnerCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"dinner"}}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["DinnerRecipes"] = dinnerRecipes
	ctx.Data["DinnerRecipesCount"] = dinnerCount

	lunchRecipes, lunchCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"lunch"}}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["LunchRecipes"] = lunchRecipes
	ctx.Data["LunchRecipesCount"] = lunchCount

	breakfastRecipes, breakfastCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"breakfast"}}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["BreakfastRecipes"] = breakfastRecipes
	ctx.Data["BreakfastRecipesCount"] = breakfastCount

	ctx.Data["HomeTitle"] = rc.cfg.HomeTitle
	ctx.Data["HomeImage"] = rc.cfg.HomeImage
	rc.HTML(resp, http.StatusOK, "home", context.Get(req).Data)
}
