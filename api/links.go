package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getRecipeLinks(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	recipes, err := h.model.Recipes.ListLinks(recipeID)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, recipes)
}

func (h apiHandler) postRecipeLink(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	var destRecipeID int64
	if err := readJsonFromRequest(req, &destRecipeID); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.model.Recipes.CreateLink(recipeID, destRecipeID); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/recipes/%d/links/%d", recipeID, destRecipeID))
	resp.WriteHeader(http.StatusCreated)
}

func (h apiHandler) deleteRecipeLink(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	destRecipeID, err := strconv.ParseInt(p.ByName("destRecipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.model.Recipes.DeleteLink(recipeID, destRecipeID); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusOK)
}
