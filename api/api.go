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
	h := apiHandler{
		cfg:   cfg,
		model: model,
	}

	h.apiMux = httprouter.New()
	h.apiMux.POST("/api/v1/auth", h.postAuthenticate)
	h.apiMux.GET("/api/v1/recipes", h.requireAuthentication(h.getRecipes))
	h.apiMux.POST("/api/v1/recipes", h.requireAuthentication(h.postRecipe))
	h.apiMux.GET("/api/v1/recipes/:recipeID", h.requireAuthentication(h.getRecipe))
	h.apiMux.PUT("/api/v1/recipes/:recipeID", h.requireAuthentication(h.putRecipe))
	h.apiMux.DELETE("/api/v1/recipes/:recipeID", h.requireAuthentication(h.deleteRecipe))
	h.apiMux.PUT("/api/v1/recipes/:recipeID/rating", h.requireAuthentication(h.putRecipeRating))
	h.apiMux.GET("/api/v1/recipes/:recipeID/image", h.requireAuthentication(h.getRecipeMainImage))
	h.apiMux.PUT("/api/v1/recipes/:recipeID/image", h.requireAuthentication(h.putRecipeMainImage))
	h.apiMux.GET("/api/v1/recipes/:recipeID/images", h.requireAuthentication(h.getRecipeImages))
	h.apiMux.POST("/api/v1/recipes/:recipeID/images", h.requireAuthentication(h.postImage))
	h.apiMux.GET("/api/v1/recipes/:recipeID/notes", h.requireAuthentication(h.getRecipeNotes))
	h.apiMux.DELETE("/api/v1/images/:imageID", h.requireAuthentication(h.deleteImage))
	h.apiMux.POST("/api/v1/notes", h.requireAuthentication(h.postNote))
	h.apiMux.PUT("/api/v1/notes/:noteID", h.requireAuthentication(h.putNote))
	h.apiMux.DELETE("/api/v1/notes/:noteID", h.requireAuthentication(h.deleteNote))
	h.apiMux.GET("/api/v1/tags", h.requireAuthentication(h.getTags))
	h.apiMux.NotFound = http.HandlerFunc(h.notFound)

	return &h
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
