package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (rc Router) GetTags(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	tags, err := rc.model.Tags.ListAll()
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, tags)
}
