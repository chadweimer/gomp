package api

import (
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/api/editor"
	"github.com/chadweimer/gomp/generated/api/viewer"
	"github.com/chadweimer/gomp/generated/models"
	"github.com/chadweimer/gomp/upload"
)

func (h apiHandler) Find(resp http.ResponseWriter, req *http.Request, params viewer.FindParams) {
	query := ""
	if params.Q != nil {
		query = *params.Q
	}
	var fields []models.SearchField
	if params.Fields != nil && len(*params.Fields) > 0 {
		fields = *params.Fields
	}
	var states []models.RecipeState
	if params.States != nil && len(*params.States) > 0 {
		states = *params.States
	}
	var tags []string
	if params.Tags != nil && len(*params.Tags) > 0 {
		tags = *params.Tags
	}
	var withPictures *bool
	if params.Pictures != nil {
		switch *params.Pictures {
		case viewer.YesNoAnyYes:
			val := true
			withPictures = &val
		case viewer.YesNoAnyNo:
			val := false
			withPictures = &val
		}
	}

	filter := models.SearchFilter{
		Query:        query,
		Fields:       fields,
		Tags:         tags,
		WithPictures: withPictures,
		States:       states,
		SortBy:       params.Sort,
		SortDir:      params.Dir,
	}

	recipes, total, err := h.db.Recipes().Find(&filter, params.Page, params.Count)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, viewer.SearchResult{Recipes: *recipes, Total: total})
}

func (h apiHandler) GetRecipe(resp http.ResponseWriter, req *http.Request, recipeIdInPath viewer.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

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

func (h apiHandler) AddRecipe(resp http.ResponseWriter, req *http.Request) {
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

func (h apiHandler) SaveRecipe(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

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

func (h apiHandler) DeleteRecipe(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

	if err := h.db.Recipes().Delete(recipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	// Delete all the uploaded image files associated with the recipe also
	if err := upload.DeleteAll(h.upl, recipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) GetState(resp http.ResponseWriter, req *http.Request, recipeIdInPath viewer.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

	state, err := h.db.Recipes().GetState(recipeId)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, state)
}

func (h apiHandler) SetState(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

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

func (h apiHandler) GetRating(resp http.ResponseWriter, req *http.Request, recipeIdInPath viewer.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

	rating, err := h.db.Recipes().GetRating(recipeId)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, rating)
}

func (h apiHandler) SetRating(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

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
