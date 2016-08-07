package api

import (
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (rc Router) GetRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipes, _, err := rc.model.Search.Find(models.SearchFilter{}, 1, 10)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, recipes)
}

func (rc Router) GetRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	recipe, err := rc.model.Recipes.Read(id)
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
