package api

import (
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
)

func (rc Router) GetRecipeImages(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	images, err := rc.model.Images.List(recipeID)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, images)
}
