package api

import (
	"context"

	"github.com/chadweimer/gomp/models"
)

func (h apiHandler) GetAllTags(ctx context.Context, request GetAllTagsRequestObject) (GetAllTagsResponseObject, error) {
	params := request.Params
	sortBy := models.TagSortByCount
	if params.Sort != nil {
		sortBy = *params.Sort
	}
	sortDir := models.Desc
	if params.Dir != nil {
		sortDir = *params.Dir
	}
	page := int64(1)
	if params.Page != nil && *params.Page > 0 {
		page = *params.Page
	}

	tags, total, err := h.db.Tags().List(ctx, sortBy, sortDir, page, params.Count)
	if err != nil {
		return nil, err
	}

	return GetAllTags200JSONResponse{Tags: tags, Total: total}, nil
}
