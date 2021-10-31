package api

import (
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/models"
	"github.com/chadweimer/gomp/upload"
)

func (h *apiHandler) getRecipes(resp http.ResponseWriter, req *http.Request) {
	query := getParam(req.URL.Query(), "q")
	fields := asFields(getParams(req.URL.Query(), "fields[]"))
	tags := getParams(req.URL.Query(), "tags[]")
	states := asStates(getParams(req.URL.Query(), "states[]"))
	sortBy := models.SortBy(getParam(req.URL.Query(), "sort"))
	sortDir := models.SortDir(getParam(req.URL.Query(), "dir"))

	var withPictures *bool
	pictures := getParam(req.URL.Query(), "pictures")
	if pictures != "" && pictures != "null" {
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

	h.OK(resp, models.SearchResult{Recipes: *recipes, Total: total})
}

func (h *apiHandler) getRecipe(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	recipe, err := h.db.Recipes().Read(recipeId)
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

func (h *apiHandler) postRecipe(resp http.ResponseWriter, req *http.Request) {
	var recipe models.Recipe
	if err := readJSONFromRequest(req, &recipe); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().Create(&recipe); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, recipe)
}

func (h *apiHandler) putRecipe(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var recipe models.Recipe
	if err := readJSONFromRequest(req, &recipe); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if recipe.Id == nil {
		recipe.Id = &recipeId
	} else if *recipe.Id != recipeId {
		h.Error(resp, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Recipes().Update(&recipe); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) deleteRecipe(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err = h.db.Recipes().Delete(recipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	// Delete all the uploaded image files associated with the recipe also
	if err = upload.DeleteAll(h.upl, recipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) putRecipeState(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var state models.RecipeState
	if err := readJSONFromRequest(req, &state); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().SetState(recipeId, state); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) putRecipeRating(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var rating float64
	if err := readJSONFromRequest(req, &rating); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().SetRating(recipeId, rating); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func asStates(arr []string) []models.RecipeState {
	states := make([]models.RecipeState, len(arr))
	for i, val := range arr {
		states[i] = models.RecipeState(val)
	}
	return states
}

func asFields(arr []string) []models.SearchField {
	fields := make([]models.SearchField, len(arr))
	for i, val := range arr {
		fields[i] = models.SearchField(val)
	}
	return fields
}
