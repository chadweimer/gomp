package api

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/julienschmidt/httprouter"
)

type Router struct {
	cfg    *conf.Config
	model  *models.Model
	apiMux *httprouter.Router
}

func NewRouter(cfg *conf.Config, model *models.Model) Router {
	r := Router{
		cfg:   cfg,
		model: model,
	}

	r.apiMux = httprouter.New()
	r.apiMux.GET("/api/v1/recipes", r.GetRecipes)
	r.apiMux.GET("/api/v1/recipes/:recipeID", r.GetRecipe)
	r.apiMux.GET("/api/v1/recipes/:recipeID/images", r.GetRecipeImages)
	r.apiMux.GET("/api/v1/recipes/:recipeID/notes", r.GetRecipeNotes)
	r.apiMux.POST("/api/v1/recipes/:recipeID/notes", r.PostNote)
	r.apiMux.PUT("/api/v1/recipes/:recipeID/notes/:noteID", r.PutNote)
	r.apiMux.DELETE("/api/v1/recipes/:recipeID/notes/:noteID", r.DeleteNote)
	r.apiMux.PUT("/api/v1/recipes/:recipeID/rating", r.PutRecipeRating)
	r.apiMux.GET("/api/v1/tags", r.GetTags)
	r.apiMux.NotFound = http.HandlerFunc(r.NotFound)

	return r
}

func (ro Router) NotFound(resp http.ResponseWriter, req *http.Request) {
	// Do nothing
}

func (r Router) ServeHTTP(resp http.ResponseWriter, req *http.Request, next http.HandlerFunc) {
	handler, _, _ := r.apiMux.Lookup(req.Method, req.URL.Path)
	if handler != nil {
		resp.Header().Set("Content-Type", "application/json")
		r.apiMux.ServeHTTP(resp, req)
		return
	}
	next(resp, req)
}

func writeJSONToResponse(resp http.ResponseWriter, data interface{}) {
	src, err := json.Marshal(data)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	dst := &bytes.Buffer{}
	if err = json.Indent(dst, src, "", "\t"); err != nil {
		writeErrorToResponse(resp, err)
		return
	}
	resp.Write(dst.Bytes())
}

func readJSONFromRequest(req *http.Request, data interface{}) error {
	return json.NewDecoder(req.Body).Decode(data)
}

func writeErrorToResponse(resp http.ResponseWriter, err error) {
	json.NewEncoder(resp).Encode(err)
	resp.WriteHeader(http.StatusInternalServerError)
}
