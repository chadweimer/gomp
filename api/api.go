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
	"github.com/go-chi/chi/v5/middleware"
)

// ---- Begin Standard Errors ----

var errMismatchedId = errors.New("id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

// ---- Begin Route Keys ----

type routeKey string

const (
	destRecipeIdKey routeKey = "destRecipeId"
	filterIdKey     routeKey = "filterId"
	imageIdKey      routeKey = "imageId"
	noteIdKey       routeKey = "noteId"
	recipeIdKey     routeKey = "recipeId"
	userIdKey       routeKey = "userId"
)

// ---- End Route Keys ----

// ---- Begin Context Keys ----

type contextKey struct {
	key string
}

func (k *contextKey) String() string {
	return "gomp context key: " + k.key
}

var (
	currentUserIdCtxKey          = &contextKey{"CurrentUserId"}
	currentUserAccessLevelCtxKey = &contextKey{"CurrentUserAccessLevel"}
)

// ---- End Context Keys ----

type apiHandler struct {
	cfg *conf.Config
	upl upload.Driver
	db  db.Driver
}

// NewHandler returns a new instance of http.Handler
func NewHandler(cfg *conf.Config, upl upload.Driver, db db.Driver) http.Handler {
	h := apiHandler{
		cfg: cfg,
		upl: upl,
		db:  db,
	}

	r := chi.NewRouter()
	r.Use(middleware.SetHeader("Content-Type", "application/json"))
	r.Route("/v1", func(r chi.Router) {
		// Public
		r.Get("/app/info", h.getAppInfo)
		r.Get("/app/configuration", h.getAppConfiguration)
		r.Post("/auth", h.postAuthenticate)
		r.NotFound(h.notFound)

		// Authenticated
		r.Group(func(r chi.Router) {
			r.Use(h.requireAuthentication)

			r.Get("/recipes", h.getRecipes)
			r.Get(fmt.Sprintf("/recipes/{%s}", recipeIdKey), h.getRecipe)
			r.Get(fmt.Sprintf("/recipes/{%s}/image", recipeIdKey), h.getRecipeMainImage)
			r.Get(fmt.Sprintf("/recipes/{%s}/images", recipeIdKey), h.getRecipeImages)
			r.Get(fmt.Sprintf("/recipes/{%s}/notes", recipeIdKey), h.getRecipeNotes)
			r.Get(fmt.Sprintf("/recipes/{%s}/links", recipeIdKey), h.getRecipeLinks)

			// Editor
			r.Group(func(r chi.Router) {
				r.Use(h.requireEditor)

				r.Post("/recipes", h.postRecipe)
				r.Put(fmt.Sprintf("/recipes/{%s}", recipeIdKey), h.putRecipe)
				r.Delete(fmt.Sprintf("/recipes/{%s}", recipeIdKey), h.deleteRecipe)
				r.Put(fmt.Sprintf("/recipes/{%s}/state", recipeIdKey), h.putRecipeState)
				r.Put(fmt.Sprintf("/recipes/{%s}/rating", recipeIdKey), h.putRecipeRating)
				r.Put(fmt.Sprintf("/recipes/{%s}/image", recipeIdKey), h.putRecipeMainImage)
				r.Post(fmt.Sprintf("/recipes/{%s}/images", recipeIdKey), h.postRecipeImage)
				r.Post(fmt.Sprintf("/recipes/{%s}/links", recipeIdKey), h.postRecipeLink)
				r.Delete(fmt.Sprintf("/recipes/{%s}/links/{%s}", recipeIdKey, destRecipeIdKey), h.deleteRecipeLink)
				r.Delete(fmt.Sprintf("/recipes/{%s}/images/{%s}", recipeIdKey, imageIdKey), h.deleteImage)
				r.Post(fmt.Sprintf("/recipes/{%s}/notes", recipeIdKey), h.postNote)
				r.Put(fmt.Sprintf("/recipes/{%s}/notes/{%s}", recipeIdKey, noteIdKey), h.putNote)
				r.Delete(fmt.Sprintf("/recipes/{%s}/notes/{%s}", recipeIdKey, noteIdKey), h.deleteNote)
				r.Post("/uploads", h.postUpload)
			})

			// Admin
			r.Group(func(r chi.Router) {
				r.Use(h.requireAdmin)

				r.Put("/app/configuration", h.putAppConfiguration)
				r.Get("/users", h.getUsers)
				r.Post("/users", h.postUser)

				// Don't allow deleting self
				r.With(h.disallowSelf).Delete(fmt.Sprintf("/users/{%s}", userIdKey), h.deleteUser)
			})

			// Admin or Self
			r.Group(func(r chi.Router) {
				r.Use(h.requireAdminUnlessSelf)

				r.Get(fmt.Sprintf("/users/{%s}", userIdKey), h.getUser)
				r.Put(fmt.Sprintf("/users/{%s}", userIdKey), h.putUser)
				r.Put(fmt.Sprintf("/users/{%s}/password", userIdKey), h.putUserPassword)
				r.Get(fmt.Sprintf("/users/{%s}/settings", userIdKey), h.getUserSettings)
				r.Put(fmt.Sprintf("/users/{%s}/settings", userIdKey), h.putUserSettings)
				r.Get(fmt.Sprintf("/users/{%s}/filters", userIdKey), h.getUserFilters)
				r.Post(fmt.Sprintf("/users/{%s}/filters", userIdKey), h.postUserFilter)
				r.Get(fmt.Sprintf("/users/{%s}/filters/{%s}", userIdKey, filterIdKey), h.getUserFilter)
				r.Put(fmt.Sprintf("/users/{%s}/filters/{%s}", userIdKey, filterIdKey), h.putUserFilter)
				r.Delete(fmt.Sprintf("/users/{%s}/filters/{%s}", userIdKey, filterIdKey), h.deleteUserFilter)
			})
		})
	})

	return r
}

func (h *apiHandler) JSON(resp http.ResponseWriter, status int, v interface{}) {
	resp.WriteHeader(status)
	enc := json.NewEncoder(resp)
	if h.cfg.IsDevelopment {
		enc.SetIndent("", "  ")
	}
	enc.Encode(v)
}

func (h *apiHandler) OK(resp http.ResponseWriter, v interface{}) {
	h.JSON(resp, http.StatusOK, v)
}

func (h *apiHandler) NoContent(resp http.ResponseWriter) {
	resp.WriteHeader(http.StatusNoContent)
}

func (h *apiHandler) Created(resp http.ResponseWriter, v interface{}) {
	h.JSON(resp, http.StatusCreated, v)
}

func (h *apiHandler) CreatedWithLocation(resp http.ResponseWriter, location string) {
	resp.Header().Set("Location", location)
	resp.WriteHeader(http.StatusCreated)
}

func (h *apiHandler) Error(resp http.ResponseWriter, status int, err error) {
	log.Print(err.Error())
	h.JSON(resp, status, err.Error())
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

func getResourceIdFromUrl(req *http.Request, idKey routeKey) (int64, error) {
	idStr := chi.URLParam(req, string(idKey))

	// Special case for userId
	if idKey == userIdKey && idStr == "current" {
		return getResourceIdFromCtx(req, currentUserIdCtxKey)
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse %s from URL, value = %s: %v", idKey, idStr, err)
	}

	return id, nil
}

func getResourceIdFromCtx(req *http.Request, idKey *contextKey) (int64, error) {
	idVal := req.Context().Value(idKey)

	id, ok := idVal.(int64)
	if ok {
		return id, nil
	}

	idPtr, ok := idVal.(*int64)
	if ok {
		return *idPtr, nil
	}

	return 0, fmt.Errorf("value of %s is not an integer", idKey)
}
