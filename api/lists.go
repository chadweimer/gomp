package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getLists(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	// Add pagination?
	lists, err := h.model.Lists.List()
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, lists)
}

func (h apiHandler) getList(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	listID, err := strconv.ParseInt(p.ByName("listID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	list, err := h.model.Lists.Read(listID)
	if err == models.ErrNotFound {
		h.JSON(resp, http.StatusNotFound, err.Error())
		return
	}
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, list)
}

func (h apiHandler) postList(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var list models.RecipeListCompact
	if err := readJSONFromRequest(req, &list); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.model.Lists.Create(&list); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/lists/%d", list.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (h apiHandler) putList(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	listID, err := strconv.ParseInt(p.ByName("listID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	var list models.RecipeListCompact
	if err := readJSONFromRequest(req, &list); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if list.ID != listID {
		h.JSON(resp, http.StatusBadRequest, errMismatchedID.Error())
		return
	}

	if err := h.model.Lists.Update(&list); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) deleteList(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	listID, err := strconv.ParseInt(p.ByName("listID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.model.Lists.Delete(listID); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusOK)
}

func (h apiHandler) getListRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	// TODO
}

func (h apiHandler) postListRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	// TODO
}

func (h apiHandler) deleteListRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	// TODO
}
