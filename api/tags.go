package api

import (
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
)

func (h *apiHandler) getTags(resp http.ResponseWriter, req *http.Request) {
	sortBy := getParam(req.URL.Query(), "sort")
	sortDir := getParam(req.URL.Query(), "dir")
	count, err := strconv.ParseInt(getParam(req.URL.Query(), "count"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	filter := models.TagsFilter{
		SortBy:  sortBy,
		SortDir: sortDir,
		Count:   count,
	}

	tags, err := h.db.Tags().Find(&filter)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, tags)
}
