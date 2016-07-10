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
		models.SearchFilter{Tags: []string{"dinner"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["DinnerRecipes"] = dinnerRecipes

	lunchRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"lunch"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["LunchRecipes"] = lunchRecipes

	breakfastRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"breakfast"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["BreakfastRecipes"] = breakfastRecipes

	drinkRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"drink", "cocktail"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["DrinkRecipes"] = drinkRecipes

	beefRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"beef", "steak"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["BeefRecipes"] = beefRecipes

	poultryRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"poultry", "chicken", "turkey"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["PoultryRecipes"] = poultryRecipes

	porkRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"pork"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["PorkRecipes"] = porkRecipes

	seafoodRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"seafood", "fish"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["SeafoodRecipes"] = seafoodRecipes

	vegetarianRecipes, _, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"vegetarian"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["VegetarianRecipes"] = vegetarianRecipes

	ctx.Data["HomeTitle"] = rc.cfg.HomeTitle
	ctx.Data["HomeImage"] = rc.cfg.HomeImage
	rc.HTML(resp, http.StatusOK, "home", context.Get(req).Data)
}
