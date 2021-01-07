package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/upload"
	"github.com/julienschmidt/httprouter"
	"github.com/unrolled/render"
)

// ---- Begin Standard Errors ----

var errMismatchedID = errors.New("The id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

type apiHandler struct {
	rnd    *render.Render
	cfg    *conf.Config
	upl    upload.Driver
	db     db.Driver
	apiMux *httprouter.Router
}

// NewHandler returns a new instance of http.Handler
func NewHandler(renderer *render.Render, cfg *conf.Config, upl upload.Driver, db db.Driver) http.Handler {
	h := apiHandler{
		rnd:    renderer,
		cfg:    cfg,
		upl:    upl,
		db:     db,
		apiMux: httprouter.New(),
	}

	// Public
	h.apiMux.GET("/api/v1/app/configuration", h.getAppConfiguration)
	h.apiMux.POST("/api/v1/auth", h.postAuthenticate)
	h.apiMux.NotFound = http.HandlerFunc(h.notFound)

	// Authenticated
	h.apiMux.GET("/api/v1/recipes", h.requireAuthentication(h.getRecipes))
	h.apiMux.GET("/api/v1/recipes/:recipeID", h.requireAuthentication(h.getRecipe))
	h.apiMux.GET("/api/v1/recipes/:recipeID/image", h.requireAuthentication(h.getRecipeMainImage))
	h.apiMux.GET("/api/v1/recipes/:recipeID/images", h.requireAuthentication(h.getRecipeImages))
	h.apiMux.GET("/api/v1/recipes/:recipeID/notes", h.requireAuthentication(h.getRecipeNotes))
	h.apiMux.GET("/api/v1/recipes/:recipeID/links", h.requireAuthentication(h.getRecipeLinks))
	h.apiMux.GET("/api/v1/tags", h.requireAuthentication(h.getTags))

	// Editor
	h.apiMux.POST("/api/v1/recipes", h.requireAuthentication(h.requireEditor(h.postRecipe)))
	h.apiMux.PUT("/api/v1/recipes/:recipeID", h.requireAuthentication(h.requireEditor(h.putRecipe)))
	h.apiMux.DELETE("/api/v1/recipes/:recipeID", h.requireAuthentication(h.requireEditor(h.deleteRecipe)))
	h.apiMux.PUT("/api/v1/recipes/:recipeID/state", h.requireAuthentication(h.requireEditor(h.putRecipeState)))
	h.apiMux.PUT("/api/v1/recipes/:recipeID/rating", h.requireAuthentication(h.requireEditor(h.putRecipeRating)))
	h.apiMux.PUT("/api/v1/recipes/:recipeID/image", h.requireAuthentication(h.requireEditor(h.putRecipeMainImage)))
	h.apiMux.POST("/api/v1/recipes/:recipeID/images", h.requireAuthentication(h.requireEditor(h.postRecipeImage)))
	h.apiMux.POST("/api/v1/recipes/:recipeID/links", h.requireAuthentication(h.requireEditor(h.postRecipeLink)))
	h.apiMux.DELETE("/api/v1/recipes/:recipeID/links/:destRecipeID", h.requireAuthentication(h.requireEditor(h.deleteRecipeLink)))
	h.apiMux.DELETE("/api/v1/images/:imageID", h.requireAuthentication(h.requireEditor(h.deleteImage)))
	h.apiMux.POST("/api/v1/notes", h.requireAuthentication(h.requireEditor(h.postNote)))
	h.apiMux.PUT("/api/v1/notes/:noteID", h.requireAuthentication(h.requireEditor(h.putNote)))
	h.apiMux.DELETE("/api/v1/notes/:noteID", h.requireAuthentication(h.requireEditor(h.deleteNote)))
	h.apiMux.POST("/api/v1/uploads", h.requireAuthentication(h.requireEditor(h.postUpload)))

	// Admin
	h.apiMux.PUT("/api/v1/app/configuration", h.requireAuthentication(h.requireAdmin(h.putAppConfiguration)))
	h.apiMux.GET("/api/v1/users", h.requireAuthentication(h.requireAdmin(h.getUsers)))
	h.apiMux.POST("/api/v1/users", h.requireAuthentication(h.requireAdmin(h.postUser)))
	h.apiMux.GET("/api/v1/users/:userID", h.requireAuthentication(h.requireAdminUnlessSelf(h.getUser)))
	h.apiMux.PUT("/api/v1/users/:userID", h.requireAuthentication(h.requireAdminUnlessSelf(h.putUser)))
	h.apiMux.DELETE("/api/v1/users/:userID", h.requireAuthentication(h.requireAdmin(h.disallowSelf(h.deleteUser))))
	h.apiMux.PUT("/api/v1/users/:userID/password", h.requireAuthentication(h.requireAdminUnlessSelf(h.putUserPassword)))
	h.apiMux.GET("/api/v1/users/:userID/settings", h.requireAuthentication(h.requireAdminUnlessSelf(h.getUserSettings)))
	h.apiMux.PUT("/api/v1/users/:userID/settings", h.requireAuthentication(h.requireAdminUnlessSelf(h.putUserSettings)))

	return &h
}

func (h *apiHandler) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	resp.Header().Set("Content-Type", "application/json")
	h.apiMux.ServeHTTP(resp, req)
}

func (h *apiHandler) OK(resp http.ResponseWriter, v interface{}) {
	h.rnd.JSON(resp, http.StatusOK, v)
}

func (h *apiHandler) NoContent(resp http.ResponseWriter) {
	resp.WriteHeader(http.StatusNoContent)
}

func (h *apiHandler) Created(resp http.ResponseWriter, location string) {
	resp.Header().Set("Location", location)
	resp.WriteHeader(http.StatusCreated)
}

func (h *apiHandler) Error(resp http.ResponseWriter, status int, err error) {
	log.Print(err.Error())
	h.rnd.JSON(resp, status, err.Error())
}

func (h *apiHandler) notFound(resp http.ResponseWriter, req *http.Request) {
	h.Error(resp, http.StatusNotFound, fmt.Errorf("%s is not a valid API endpoint", req.URL.Path))
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
