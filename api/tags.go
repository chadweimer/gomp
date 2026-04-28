package api

import "context"

func (h apiHandler) GetAllTags(ctx context.Context, _ GetAllTagsRequestObject) (GetAllTagsResponseObject, error) {
	tags, err := h.db.Tags().List(ctx)
	if err != nil {
		return nil, err
	}

	return GetAllTags200JSONResponse(*tags), nil
}
