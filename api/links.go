package api

import (
	"net/http"
)

func (h apiHandler) GetLinks(w http.ResponseWriter, r *http.Request, recipeId int64) {
	recipes, err := h.db.Links().List(recipeId)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, recipes)
}

func (h apiHandler) AddLink(w http.ResponseWriter, r *http.Request, recipeId int64, destRecipeId int64) {
	if err := h.db.Links().Create(recipeId, destRecipeId); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) DeleteLink(w http.ResponseWriter, r *http.Request, recipeId int64, destRecipeId int64) {
	if err := h.db.Links().Delete(recipeId, destRecipeId); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}
