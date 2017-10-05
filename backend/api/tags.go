package api

import (
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/backend/models"
	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getTags(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	sortBy := getParam(req.URL.Query(), "sort")
	sortDir := getParam(req.URL.Query(), "dir")
	count, err := strconv.ParseInt(getParam(req.URL.Query(), "count"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	filter := models.TagsFilter{
		SortBy:  sortBy,
		SortDir: sortDir,
		Count:   count,
	}

	tags, err := h.model.Search.FindTags(filter)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, tags)
}
