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

func (h apiHandler) getRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	query := getParam(req.URL.Query(), "q")
	tags := getParams(req.URL.Query(), "tags[]")
	sortBy := getParam(req.URL.Query(), "sort")
	sortDir := getParam(req.URL.Query(), "dir")
	page, err := strconv.ParseInt(getParam(req.URL.Query(), "page"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}
	count, err := strconv.ParseInt(getParam(req.URL.Query(), "count"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
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

	recipes, total, err := h.model.Search.FindRecipes(filter)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, getRecipesResponse{Recipes: recipes, Total: total})
}

func (h apiHandler) getRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	recipe, err := h.model.Recipes.Read(recipeID)
	if err == models.ErrNotFound {
		h.JSON(resp, http.StatusNotFound, err.Error())
		return
	}
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, recipe)
}

func (h apiHandler) postRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var recipe models.Recipe
	if err := readJSONFromRequest(req, &recipe); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.model.Recipes.Create(&recipe); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/recipes/%d", recipe.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (h apiHandler) putRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	var recipe models.Recipe
	if err := readJSONFromRequest(req, &recipe); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if recipe.ID != recipeID {
		h.JSON(resp, http.StatusBadRequest, errMismatchedRecipeID.Error())
		return
	}

	if err := h.model.Recipes.Update(&recipe); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) deleteRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	err = h.model.Recipes.Delete(recipeID)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusOK)
}

func (h apiHandler) putRecipeRating(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	var rating float64
	if err := readJSONFromRequest(req, &rating); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.model.Recipes.SetRating(recipeID, rating); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}