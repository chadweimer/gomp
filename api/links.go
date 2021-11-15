package api

import (
	"net/http"
)

func (h apiHandler) GetLinks(resp http.ResponseWriter, req *http.Request, recipeId int64) {
	recipes, err := h.db.Links().List(recipeId)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, recipes)
}

func (h apiHandler) AddLink(resp http.ResponseWriter, req *http.Request, recipeId int64, destRecipeId int64) {
	if err := h.db.Links().Create(recipeId, destRecipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) DeleteLink(resp http.ResponseWriter, req *http.Request, recipeId int64, destRecipeId int64) {
	if err := h.db.Links().Delete(recipeId, destRecipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
