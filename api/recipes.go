package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

type getRecipesResponse struct {
	Recipes *models.Recipes `json:"recipes"`
	Total   int64           `json:"total"`
}

func (r Router) getRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	query := req.URL.Query().Get("q")
	tags := req.URL.Query()["tags[]"]
	sortBy := req.URL.Query().Get("sort")
	sortDir := req.URL.Query().Get("dir")
	page, err := strconv.ParseInt(req.URL.Query().Get("page"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}
	count, err := strconv.ParseInt(req.URL.Query().Get("count"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	filter := models.RecipesFilter{
		Query:   query,
		Tags:    tags,
		SortBy:  sortBy,
		SortDir: sortDir,
		Page:    page,
		Count:   count,
	}

	recipes, total, err := r.model.Search.FindRecipes(filter)
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, getRecipesResponse{Recipes: recipes, Total: total})
}

func (r Router) getRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	recipe, err := r.model.Recipes.Read(recipeID)
	if err == models.ErrNotFound {
		writeErrorToResponse(resp, http.StatusNotFound, err)
		return
	}
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, recipe)
}

func (r Router) postRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var recipe models.Recipe
	if err := readJSONFromRequest(req, &recipe); err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	if err := r.model.Recipes.Create(&recipe); err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("%s/api/v1/recipes/%d", r.cfg.RootURLPath, recipe.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (r Router) putRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	var recipe models.Recipe
	if err := readJSONFromRequest(req, &recipe); err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	if recipe.ID != recipeID {
		writeClientErrorToResponse(resp, errMismatchedRecipeID)
		return
	}

	if err := r.model.Recipes.Update(&recipe); err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (r Router) deleteRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	err = r.model.Recipes.Delete(recipeID)
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusOK)
}

func (r Router) putRecipeRating(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	var rating float64
	if err := readJSONFromRequest(req, &rating); err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	if err := r.model.Recipes.SetRating(recipeID, rating); err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}
