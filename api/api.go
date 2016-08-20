package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
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

type apiHandler struct {
	cfg    *conf.Config
	model  *models.Model
	apiMux *httprouter.Router
}

// NewHandler returns a new instance of http.Handler
func NewHandler(cfg *conf.Config, model *models.Model) http.Handler {
	r := apiHandler{
		cfg:   cfg,
		model: model,
	}

	r.apiMux = httprouter.New()
	r.apiMux.POST("/api/v1/auth", r.postAuthenticate)
	r.apiMux.GET("/api/v1/recipes", r.requireAuthentication(r.getRecipes))
	r.apiMux.POST("/api/v1/recipes", r.requireAuthentication(r.postRecipe))
	r.apiMux.GET("/api/v1/recipes/:recipeID", r.requireAuthentication(r.getRecipe))
	r.apiMux.PUT("/api/v1/recipes/:recipeID", r.requireAuthentication(r.putRecipe))
	r.apiMux.DELETE("/api/v1/recipes/:recipeID", r.requireAuthentication(r.deleteRecipe))
	r.apiMux.PUT("/api/v1/recipes/:recipeID/rating", r.requireAuthentication(r.putRecipeRating))
	r.apiMux.GET("/api/v1/recipes/:recipeID/image", r.requireAuthentication(r.getRecipeMainImage))
	r.apiMux.PUT("/api/v1/recipes/:recipeID/image", r.requireAuthentication(r.putRecipeMainImage))
	r.apiMux.GET("/api/v1/recipes/:recipeID/images", r.requireAuthentication(r.getRecipeImages))
	r.apiMux.POST("/api/v1/recipes/:recipeID/images", r.requireAuthentication(r.postImage))
	r.apiMux.GET("/api/v1/recipes/:recipeID/notes", r.requireAuthentication(r.getRecipeNotes))
	r.apiMux.DELETE("/api/v1/images/:imageID", r.requireAuthentication(r.deleteImage))
	r.apiMux.POST("/api/v1/notes", r.requireAuthentication(r.postNote))
	r.apiMux.PUT("/api/v1/notes/:noteID", r.requireAuthentication(r.putNote))
	r.apiMux.DELETE("/api/v1/notes/:noteID", r.requireAuthentication(r.deleteNote))
	r.apiMux.GET("/api/v1/tags", r.requireAuthentication(r.getTags))
	r.apiMux.NotFound = http.HandlerFunc(r.notFound)

	return &r
}

func (h apiHandler) notFound(resp http.ResponseWriter, req *http.Request) {
	writeErrorToResponse(resp, http.StatusNotFound, fmt.Errorf("%s is not a valid API endpoint", req.URL.Path))
}

func (h apiHandler) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	resp.Header().Set("Content-Type", "application/json")
	h.apiMux.ServeHTTP(resp, req)
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

func writeUnauthorizedErrorToResponse(resp http.ResponseWriter, err error) {
	writeErrorToResponse(resp, http.StatusUnauthorized, err)
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
