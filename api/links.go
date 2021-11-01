package api

import (
	"net/http"
)

func (h *apiHandler) getRecipeLinks(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	recipes, err := h.db.Links().List(recipeId)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, recipes)
}

func (h *apiHandler) putRecipeLink(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	destRecipeId, err := getResourceIdFromUrl(req, destRecipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Links().Create(recipeId, destRecipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) deleteRecipeLink(resp http.ResponseWriter, req *http.Request) {
	recipeId, err := getResourceIdFromUrl(req, recipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	destRecipeId, err := getResourceIdFromUrl(req, destRecipeIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Links().Delete(recipeId, destRecipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
