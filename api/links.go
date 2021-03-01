package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
)

func (h *apiHandler) getRecipeLinks(resp http.ResponseWriter, req *http.Request) {
	recipeIDStr := chi.URLParam(req, recipeIDKey)
	recipeID, err := strconv.ParseInt(recipeIDStr, 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	recipes, err := h.db.Links().List(recipeID)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, recipes)
}

func (h *apiHandler) postRecipeLink(resp http.ResponseWriter, req *http.Request) {
	recipeIDStr := chi.URLParam(req, recipeIDKey)
	recipeID, err := strconv.ParseInt(recipeIDStr, 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var destRecipeID int64
	if err := readJSONFromRequest(req, &destRecipeID); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Links().Create(recipeID, destRecipeID); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, fmt.Sprintf("/api/v1/recipes/%d/links/%d", recipeID, destRecipeID))
}

func (h *apiHandler) deleteRecipeLink(resp http.ResponseWriter, req *http.Request) {
	recipeIDStr := chi.URLParam(req, recipeIDKey)
	recipeID, err := strconv.ParseInt(recipeIDStr, 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	destRecipeIDStr := chi.URLParam(req, destRecipeIDKey)
	destRecipeID, err := strconv.ParseInt(destRecipeIDStr, 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Links().Delete(recipeID, destRecipeID); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
