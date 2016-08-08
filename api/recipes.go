package api

import (
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (r Router) GetRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipes, _, err := r.model.Search.Find(models.SearchFilter{}, 1, 10)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, recipes)
}

func (r Router) GetRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	recipe, err := r.model.Recipes.Read(id)
	if err == models.ErrNotFound {
		resp.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, recipe)
}

func (r Router) PutRecipeRating(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	var rating float64
	if err := readJSONFromRequest(req, &rating); err != nil {
		resp.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := r.model.Recipes.SetRating(id, rating); err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}
