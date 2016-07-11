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
		models.SearchFilter{SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["Recipes"] = dinnerRecipes
	ctx.Data["RecipesCount"] = dinnerCount

	drinkRecipes, drinkCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"drink", "cocktail"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["DrinkRecipes"] = drinkRecipes
	ctx.Data["DrinkCount"] = drinkCount

	beefRecipes, beefCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"beef", "steak"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["BeefRecipes"] = beefRecipes
	ctx.Data["BeefCount"] = beefCount

	poultryRecipes, poultryCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"poultry", "chicken", "turkey"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["PoultryRecipes"] = poultryRecipes
	ctx.Data["PoultryCount"] = poultryCount

	porkRecipes, porkCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"pork"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["PorkRecipes"] = porkRecipes
	ctx.Data["PorkCount"] = porkCount

	seafoodRecipes, seafoodCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"seafood", "fish"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["SeafoodRecipes"] = seafoodRecipes
	ctx.Data["SeafoodCount"] = seafoodCount

	vegetarianRecipes, vegetarianCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"vegetarian"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["VegetarianRecipes"] = vegetarianRecipes
	ctx.Data["VegetarianCount"] = vegetarianCount

	pastaRecipes, pastaCount, err := rc.model.Search.Find(
		models.SearchFilter{Tags: []string{"pasta"}, SortBy: models.SortByRandom}, 1, 6)
	if rc.HasError(resp, req, err) {
		return
	}
	ctx.Data["PastaRecipes"] = pastaRecipes
	ctx.Data["PastaCount"] = pastaCount

	ctx.Data["HomeTitle"] = rc.cfg.HomeTitle
	ctx.Data["HomeImage"] = rc.cfg.HomeImage
	rc.HTML(resp, http.StatusOK, "home", context.Get(req).Data)
}
