package api

import (
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

type getRecipesResponse struct {
	Recipes *models.Recipes `json:"recipes"`
	Total   int64           `json:"total"`
}

func (r Router) GetRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	query := req.URL.Query().Get("q")
	tags := req.URL.Query()["tags[]"]
	sortBy := req.URL.Query().Get("sort")
	sortDir := req.URL.Query().Get("dir")
	page, err := strconv.ParseInt(req.URL.Query().Get("page"), 10, 64)
	count, err := strconv.ParseInt(req.URL.Query().Get("count"), 10, 64)

	filter := models.SearchFilter{
		Query:   query,
		Tags:    tags,
		SortBy:  sortBy,
		SortDir: sortDir,
		Page:    page,
		Count:   count,
	}
	if req.ContentLength > 0 {
		if err := readJSONFromRequest(req, &filter); err != nil {
			writeClientErrorToResponse(resp, err)
			return
		}
	}

	recipes, total, err := r.model.Search.Find(filter)
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, getRecipesResponse{Recipes: recipes, Total: total})
}

func (r Router) GetRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
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

func (r Router) PutRecipeRating(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
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
