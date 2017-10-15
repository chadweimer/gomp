package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/modules/upload"
	"github.com/julienschmidt/httprouter"
	"github.com/unrolled/render"
)

// ---- Begin Standard Errors ----

var errMismatchedNoteID = errors.New("The note id in the path does not match the one specified in the request body")
var errMismatchedRecipeID = errors.New("The recipe id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

type apiHandler struct {
	*render.Render

	cfg    *conf.Config
	upl    upload.Driver
	model  *models.Model
	apiMux *httprouter.Router
}

// NewHandler returns a new instance of http.Handler
func NewHandler(renderer *render.Render, cfg *conf.Config, upl upload.Driver, model *models.Model) http.Handler {
	h := apiHandler{
		Render: renderer,

		cfg:   cfg,
		upl:   upl,
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
	h.apiMux.POST("/api/v1/recipes/:recipeID/images", h.requireAuthentication(h.postRecipeImage))
	h.apiMux.GET("/api/v1/recipes/:recipeID/notes", h.requireAuthentication(h.getRecipeNotes))
	h.apiMux.DELETE("/api/v1/images/:imageID", h.requireAuthentication(h.deleteImage))
	h.apiMux.POST("/api/v1/notes", h.requireAuthentication(h.postNote))
	h.apiMux.PUT("/api/v1/notes/:noteID", h.requireAuthentication(h.putNote))
	h.apiMux.DELETE("/api/v1/notes/:noteID", h.requireAuthentication(h.deleteNote))
	h.apiMux.GET("/api/v1/tags", h.requireAuthentication(h.getTags))
	h.apiMux.GET("/api/v1/users/:userID/settings", h.requireAuthentication(h.getUserSettings))
	h.apiMux.PUT("/api/v1/users/:userID/settings", h.requireAuthentication(h.putUserSettings))
	h.apiMux.POST("/api/v1/uploads", h.requireAuthentication(h.postUpload))
	h.apiMux.NotFound = http.HandlerFunc(h.notFound)

	return &h
}

func (h apiHandler) notFound(resp http.ResponseWriter, req *http.Request) {
	h.JSON(resp, http.StatusNotFound, fmt.Sprintf("%s is not a valid API endpoint", req.URL.Path))
}

func (h apiHandler) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	resp.Header().Set("Content-Type", "application/json")
	h.apiMux.ServeHTTP(resp, req)
}

func getParam(values url.Values, key string) string {
	val, _ := url.QueryUnescape(values.Get(key))
	return val
}

func getParams(values url.Values, key string) []string {
	var vals []string
	var ok bool
	if vals, ok = values[key]; ok {
		for i, val := range vals {
			vals[i], _ = url.QueryUnescape(val)
		}
	}

	return vals
}

func readJSONFromRequest(req *http.Request, data interface{}) error {
	return json.NewDecoder(req.Body).Decode(data)
}
