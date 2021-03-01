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
	"github.com/go-chi/chi"
	"github.com/unrolled/render"
)

// ---- Begin Standard Errors ----

var errMismatchedID = errors.New("The id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

// ---- Begin Route Keys ----

const (
	currentUserIDKey          string = "CurrentUserID"
	currentUserAccessLevelKey string = "CurrentUserAccessLevel"
	destRecipeIDKey           string = "destRecipeID"
	filterIDKey               string = "filterID"
	imageIDKey                string = "imageID"
	noteIDKey                 string = "noteID"
	recipeIDKey               string = "recipeID"
	userIDKey                 string = "userID"
)

// ---- End Route Keys ----

type apiHandler struct {
	rnd *render.Render
	cfg *conf.Config
	upl upload.Driver
	db  db.Driver
	r   chi.Router
}

// NewHandler returns a new instance of http.Handler
func NewHandler(renderer *render.Render, cfg *conf.Config, upl upload.Driver, db db.Driver) http.Handler {
	h := apiHandler{
		rnd: renderer,
		cfg: cfg,
		upl: upl,
		db:  db,
		r:   chi.NewRouter(),
	}

	h.r.Route("/v1", func(r chi.Router) {
		// Public
		r.Get("/app/configuration", h.getAppConfiguration)
		r.Post("/auth", h.postAuthenticate)
		r.NotFound(h.notFound)

		// Authenticated
		r.Group(func(r chi.Router) {
			r.Use(h.requireAuthentication)

			r.Get("/recipes", h.getRecipes)
			r.Get("/recipes/{recipeID}", h.getRecipe)
			r.Get("/recipes/{recipeID}/image", h.getRecipeMainImage)
			r.Get("/recipes/{recipeID}/images", h.getRecipeImages)
			r.Get("/recipes/{recipeID}/notes", h.getRecipeNotes)
			r.Get("/recipes/{recipeID}/links", h.getRecipeLinks)
			r.Get("/tags", h.getTags)

			// Editor
			r.Group(func(r chi.Router) {
				r.Use(h.requireEditor)

				r.Post("/recipes", h.postRecipe)
				r.Put("/recipes/{recipeID}", h.putRecipe)
				r.Delete("/recipes/{recipeID}", h.deleteRecipe)
				r.Put("/recipes/{recipeID}/state", h.putRecipeState)
				r.Put("/recipes/{recipeID}/rating", h.putRecipeRating)
				r.Put("/recipes/{recipeID}/image", h.putRecipeMainImage)
				r.Post("/recipes/{recipeID}/images", h.postRecipeImage)
				r.Post("/recipes/{recipeID}/links", h.postRecipeLink)
				r.Delete("/recipes/{recipeID}/links/{destRecipeID}", h.deleteRecipeLink)
				r.Delete("/images/{imageID}", h.deleteImage)
				r.Post("/notes", h.postNote)
				r.Put("/notes/{noteID}", h.putNote)
				r.Delete("/notes/{noteID}", h.deleteNote)
				r.Post("/uploads", h.postUpload)
			})

			// Admin
			r.Group(func(r chi.Router) {
				r.Use(h.requireAdmin)

				r.Put("/app/configuration", h.putAppConfiguration)
				r.Get("/users", h.getUsers)
				r.Post("/users", h.postUser)

				// Don't allow deleting self
				r.With(h.disallowSelf).Delete("/users/{userID}", h.deleteUser)
			})

			// Admin or Self
			r.Group(func(r chi.Router) {
				r.Use(h.requireAdminUnlessSelf)

				r.Get("/users/{userID}", h.getUser)
				r.Put("/users/{userID}", h.putUser)
				r.Put("/users/{userID}/password", h.putUserPassword)
				r.Get("/users/{userID}/settings", h.getUserSettings)
				r.Put("/users/{userID}/settings", h.putUserSettings)
				r.Get("/users/{userID}/filters", h.getUserFilters)
				r.Post("/users/{userID}/filters", h.postUserFilter)
				r.Get("/users/{userID}/filters/{filterID}", h.getUserFilter)
				r.Put("/users/{userID}/filters/{filterID}", h.putUserFilter)
				r.Delete("/users/{userID}/filters/{filterID}", h.deleteUserFilter)
			})
		})
	})

	return &h
}

func (h *apiHandler) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	resp.Header().Set("Content-Type", "application/json")
	h.r.ServeHTTP(resp, req)
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
	if rawVals, ok := values[key]; ok {
		for _, rawVal := range rawVals {
			safeVal, err := url.QueryUnescape(rawVal)
			if err == nil && safeVal != "" {
				vals = append(vals, safeVal)
			}
		}
	}

	return vals
}

func readJSONFromRequest(req *http.Request, data interface{}) error {
	return json.NewDecoder(req.Body).Decode(data)
}
