package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/julienschmidt/httprouter"
)

type getRecipesResponse struct {
	Recipes *[]models.RecipeCompact `json:"recipes"`
	Total   int64                   `json:"total"`
}

func (h *apiHandler) getRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	query := getParam(req.URL.Query(), "q")
	fields := getParams(req.URL.Query(), "fields[]")
	tags := getParams(req.URL.Query(), "tags[]")
	states := getParams(req.URL.Query(), "states[]")
	sortBy := getParam(req.URL.Query(), "sort")
	sortDir := getParam(req.URL.Query(), "dir")

	var withPictures *bool
	pictures := getParams(req.URL.Query(), "pictures")
  if pictures != "" {
		withPics, err := strconv.ParseBool(pictures)
		if err == nil {
			withPictures = &withPics
		} else {
			h.Error(resp, http.StatusBadRequest, err)
			return
		}
	}

	page, err := strconv.ParseInt(getParam(req.URL.Query(), "page"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	count, err := strconv.ParseInt(getParam(req.URL.Query(), "count"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	filter := models.SearchFilter{
		Query:        query,
		Fields:       fields,
		Tags:         tags,
		WithPictures: withPictures,
		States:       states,
		SortBy:       sortBy,
		SortDir:      sortDir,
	}

	recipes, total, err := h.db.Recipes().Find(&filter, page, count)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, getRecipesResponse{Recipes: recipes, Total: total})
}

func (h *apiHandler) getRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	recipe, err := h.db.Recipes().Read(recipeID)
	if err == db.ErrNotFound {
		h.Error(resp, http.StatusNotFound, err)
		return
	}
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, recipe)
}

func (h *apiHandler) postRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var recipe models.Recipe
	if err := readJSONFromRequest(req, &recipe); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().Create(&recipe); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, fmt.Sprintf("/api/v1/recipes/%d", recipe.ID))
}

func (h *apiHandler) putRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var recipe models.Recipe
	if err := readJSONFromRequest(req, &recipe); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if recipe.ID != recipeID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
		return
	}

	if err := h.db.Recipes().Update(&recipe); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) deleteRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err = h.db.Recipes().Delete(recipeID); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	// Delete all the uploaded image files associated with the recipe also
	if err = upload.DeleteAll(h.upl, recipeID); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) putRecipeState(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var state models.RecipeState
	if err := readJSONFromRequest(req, &state); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().SetState(recipeID, state); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) putRecipeRating(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var rating float64
	if err := readJSONFromRequest(req, &rating); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().SetRating(recipeID, rating); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
