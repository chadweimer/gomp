package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
)

func (h *apiHandler) getRecipeLinks(resp http.ResponseWriter, req *http.Request) {
	p := httprouter.ParamsFromContext(req.Context())
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
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
	p := httprouter.ParamsFromContext(req.Context())
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
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
	p := httprouter.ParamsFromContext(req.Context())
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	destRecipeID, err := strconv.ParseInt(p.ByName("destRecipeID"), 10, 64)
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
