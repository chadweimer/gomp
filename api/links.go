package api

import (
	"fmt"
	"net/http"
)

func (h *apiHandler) getRecipeLinks(resp http.ResponseWriter, req *http.Request) {
	recipeID, err := getResourceIDFromURL(req, recipeIDKey)
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
	recipeID, err := getResourceIDFromURL(req, recipeIDKey)
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

	h.CreatedWithLocation(resp, fmt.Sprintf("/api/v1/recipes/%d/links/%d", recipeID, destRecipeID))
}

func (h *apiHandler) deleteRecipeLink(resp http.ResponseWriter, req *http.Request) {
	recipeID, err := getResourceIDFromURL(req, recipeIDKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	destRecipeID, err := getResourceIDFromURL(req, destRecipeIDKey)
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
