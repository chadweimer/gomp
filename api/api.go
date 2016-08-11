package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/julienschmidt/httprouter"
)

// ---- Begin Standard Errors ----

var errMismatchedNoteID = errors.New("The note id in the path does not match the one specified in the request body")
var errMismatchedRecipeID = errors.New("The recipe id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

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
	r.apiMux.GET("/api/v1/recipes", r.getRecipes)
	r.apiMux.POST("/api/v1/recipes", r.postRecipe)
	r.apiMux.GET("/api/v1/recipes/:recipeID", r.getRecipe)
	r.apiMux.PUT("/api/v1/recipes/:recipeID", r.putRecipe)
	r.apiMux.DELETE("/api/v1/recipes/:recipeID", r.deleteRecipe)
	r.apiMux.PUT("/api/v1/recipes/:recipeID/rating", r.putRecipeRating)
	r.apiMux.GET("/api/v1/recipes/:recipeID/image", r.getRecipeMainImage)
	r.apiMux.PUT("/api/v1/recipes/:recipeID/image", r.putRecipeMainImage)
	r.apiMux.GET("/api/v1/recipes/:recipeID/images", r.getRecipeImages)
	r.apiMux.POST("/api/v1/recipes/:recipeID/images", r.postImage)
	r.apiMux.GET("/api/v1/recipes/:recipeID/notes", r.getRecipeNotes)
	r.apiMux.DELETE("/api/v1/images/:imageID", r.deleteImage)
	r.apiMux.POST("/api/v1/notes", r.postNote)
	r.apiMux.PUT("/api/v1/notes/:noteID", r.putNote)
	r.apiMux.DELETE("/api/v1/notes/:noteID", r.deleteNote)
	r.apiMux.GET("/api/v1/tags", r.getTags)
	r.apiMux.NotFound = http.HandlerFunc(r.notFound)

	return r
}

func (ro Router) notFound(resp http.ResponseWriter, req *http.Request) {
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
	if err := marshalJSON(resp, data); err != nil {
		writeServerErrorToResponse(resp, err)
	}
}

func readJSONFromRequest(req *http.Request, data interface{}) error {
	return json.NewDecoder(req.Body).Decode(data)
}

func writeServerErrorToResponse(resp http.ResponseWriter, err error) {
	writeErrorToResponse(resp, http.StatusInternalServerError, err)
}

func writeClientErrorToResponse(resp http.ResponseWriter, err error) {
	writeErrorToResponse(resp, http.StatusBadRequest, err)
}

func writeErrorToResponse(resp http.ResponseWriter, statusCode int, err error) {
	log.Println(err)
	resp.WriteHeader(statusCode)
	_ = marshalJSON(resp, err.Error())
}

func marshalJSON(resp http.ResponseWriter, data interface{}) error {
	src, err := json.Marshal(data)
	if err != nil {
		log.Println(err)
		return err
	}

	dst := &bytes.Buffer{}
	if err = json.Indent(dst, src, "", "\t"); err != nil {
		log.Println(err)
		return err
	}

	resp.Write(dst.Bytes())
	return nil
}
