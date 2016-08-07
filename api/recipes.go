package api

import (
	"encoding/json"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (rc Router) GetRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipes, _, err := rc.model.Search.Find(models.SearchFilter{}, 1, 10)
	if err != nil {
		return
	}

	json.NewEncoder(resp).Encode(recipes)
}
