package api

import (
	"net/http"

	"github.com/chadweimer/gomp/generated/models"
	"github.com/chadweimer/gomp/generated/oapi"
	"github.com/chadweimer/gomp/upload"
)

func (h apiHandler) Find(w http.ResponseWriter, r *http.Request, params oapi.FindParams) {
	query := ""
	if params.Q != nil {
		query = *params.Q
	}
	var fields []models.SearchField
	if params.Fields != nil {
		fields = *params.Fields
	}
	var states []models.RecipeState
	if params.States != nil {
		states = *params.States
	}
	var tags []string
	if params.Tags != nil {
		tags = *params.Tags
	}
	var withPictures *bool
	if params.Pictures != nil {
		switch *params.Pictures {
		case oapi.Yes:
			val := true
			withPictures = &val
		case oapi.No:
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
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, r, oapi.SearchResult{Recipes: *recipes, Total: total})
}

func (h apiHandler) GetRecipe(w http.ResponseWriter, r *http.Request, recipeId int64) {
	recipe, err := h.db.Recipes().Read(recipeId)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, r, recipe)
}

func (h apiHandler) AddRecipe(w http.ResponseWriter, r *http.Request) {
	var recipe models.Recipe
	if err := readJSONFromRequest(r, &recipe); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().Create(&recipe); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.Created(w, r, recipe)
}

func (h apiHandler) SaveRecipe(w http.ResponseWriter, r *http.Request, recipeId int64) {
	var recipe models.Recipe
	if err := readJSONFromRequest(r, &recipe); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	if recipe.Id == nil {
		recipe.Id = &recipeId
	} else if *recipe.Id != recipeId {
		h.Error(w, r, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Recipes().Update(&recipe); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) DeleteRecipe(w http.ResponseWriter, r *http.Request, recipeId int64) {
	if err := h.db.Recipes().Delete(recipeId); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	// Delete all the uploaded image files associated with the recipe also
	if err := upload.DeleteAll(h.upl, recipeId); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) SetState(w http.ResponseWriter, r *http.Request, recipeId int64) {
	var state models.RecipeState
	if err := readJSONFromRequest(r, &state); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().SetState(recipeId, state); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) GetRating(w http.ResponseWriter, r *http.Request, recipeId int64) {
	rating, err := h.db.Recipes().GetRating(recipeId)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, r, rating)
}

func (h apiHandler) SetRating(w http.ResponseWriter, r *http.Request, recipeId int64) {
	var rating float32
	if err := readJSONFromRequest(r, &rating); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Recipes().SetRating(recipeId, rating); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}
