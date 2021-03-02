package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"

	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/upload"
	"github.com/go-chi/chi/v5"
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
			r.Get(fmt.Sprintf("/recipes/{%s}", recipeIDKey), h.getRecipe)
			r.Get(fmt.Sprintf("/recipes/{%s}/image", recipeIDKey), h.getRecipeMainImage)
			r.Get(fmt.Sprintf("/recipes/{%s}/images", recipeIDKey), h.getRecipeImages)
			r.Get(fmt.Sprintf("/recipes/{%s}/notes", recipeIDKey), h.getRecipeNotes)
			r.Get(fmt.Sprintf("/recipes/{%s}/links", recipeIDKey), h.getRecipeLinks)
			r.Get("/tags", h.getTags)

			// Editor
			r.Group(func(r chi.Router) {
				r.Use(h.requireEditor)

				r.Post("/recipes", h.postRecipe)
				r.Put(fmt.Sprintf("/recipes/{%s}", recipeIDKey), h.putRecipe)
				r.Delete(fmt.Sprintf("/recipes/{%s}", recipeIDKey), h.deleteRecipe)
				r.Put(fmt.Sprintf("/recipes/{%s}/state", recipeIDKey), h.putRecipeState)
				r.Put(fmt.Sprintf("/recipes/{%s}/rating", recipeIDKey), h.putRecipeRating)
				r.Put(fmt.Sprintf("/recipes/{%s}/image", recipeIDKey), h.putRecipeMainImage)
				r.Post(fmt.Sprintf("/recipes/{%s}/images", recipeIDKey), h.postRecipeImage)
				r.Post(fmt.Sprintf("/recipes/{%s}/links", recipeIDKey), h.postRecipeLink)
				r.Delete(fmt.Sprintf("/recipes/{%s}/links/{%s}", recipeIDKey, destRecipeIDKey), h.deleteRecipeLink)
				r.Delete(fmt.Sprintf("/images/{%s}", imageIDKey), h.deleteImage)
				r.Post("/notes", h.postNote)
				r.Put(fmt.Sprintf("/notes/{%s}", noteIDKey), h.putNote)
				r.Delete(fmt.Sprintf("/notes/{%s}", noteIDKey), h.deleteNote)
				r.Post("/uploads", h.postUpload)
			})

			// Admin
			r.Group(func(r chi.Router) {
				r.Use(h.requireAdmin)

				r.Put("/app/configuration", h.putAppConfiguration)
				r.Get("/users", h.getUsers)
				r.Post("/users", h.postUser)

				// Don't allow deleting self
				r.With(h.disallowSelf).Delete(fmt.Sprintf("/users/{%s}", userIDKey), h.deleteUser)
			})

			// Admin or Self
			r.Group(func(r chi.Router) {
				r.Use(h.requireAdminUnlessSelf)

				r.Get(fmt.Sprintf("/users/{%s}", userIDKey), h.getUser)
				r.Put(fmt.Sprintf("/users/{%s}", userIDKey), h.putUser)
				r.Put(fmt.Sprintf("/users/{%s}/password", userIDKey), h.putUserPassword)
				r.Get(fmt.Sprintf("/users/{%s}/settings", userIDKey), h.getUserSettings)
				r.Put(fmt.Sprintf("/users/{%s}/settings", userIDKey), h.putUserSettings)
				r.Get(fmt.Sprintf("/users/{%s}/filters", userIDKey), h.getUserFilters)
				r.Post(fmt.Sprintf("/users/{%s}/filters", userIDKey), h.postUserFilter)
				r.Get(fmt.Sprintf("/users/{%s}/filters/{%s}", userIDKey, filterIDKey), h.getUserFilter)
				r.Put(fmt.Sprintf("/users/{%s}/filters/{%s}", userIDKey, filterIDKey), h.putUserFilter)
				r.Delete(fmt.Sprintf("/users/{%s}/filters/{%s}", userIDKey, filterIDKey), h.deleteUserFilter)
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

func getResourceIDFromURL(req *http.Request, idKey string) (int64, error) {
	idStr := chi.URLParam(req, idKey)

	// Special case for userID
	if idKey == userIDKey && idStr == "current" {
		return getResourceIDFromCtx(req, currentUserIDKey)
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse %s from URL, value = %s: %v", idKey, idStr, err)
	}

	return id, nil
}

func getResourceIDFromCtx(req *http.Request, idKey string) (int64, error) {
	id, ok := req.Context().Value(idKey).(int64)
	if !ok {
		return 0, fmt.Errorf("value of %s is not an integer", idKey)
	}
	return id, nil
}
