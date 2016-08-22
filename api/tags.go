package api

import (
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getTags(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	sortBy := req.URL.Query().Get("sort")
	sortDir := req.URL.Query().Get("dir")
	count, err := strconv.ParseInt(req.URL.Query().Get("count"), 10, 64)
	if err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}

	filter := models.TagsFilter{
		SortBy:  sortBy,
		SortDir: sortDir,
		Count:   count,
	}

	tags, err := h.model.Search.FindTags(filter)
	if err != nil {
		panic(err)
	}

	h.writeJSONToResponse(resp, tags)
}
