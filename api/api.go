package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/api/admin"
	"github.com/chadweimer/gomp/generated/api/adminOrSelf"
	"github.com/chadweimer/gomp/generated/api/editor"
	"github.com/chadweimer/gomp/generated/api/public"
	"github.com/chadweimer/gomp/generated/api/viewer"
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
	userIdKey routeKey = "userId"
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
		public.HandlerFromMux(h, r)
		r.NotFound(h.notFound)

		r.Group(func(r chi.Router) {
			r.Use(h.requireAuthentication)

			// Viewer
			viewer.HandlerFromMux(h, r)
			// Editor
			editor.HandlerFromMux(h, r.With(h.requireEditor))
			// Admin
			admin.HandlerFromMux(h, r.With(h.requireAdmin))
			// Admin or Self
			adminOrSelf.HandlerFromMux(h, r.With(h.requireAdminUnlessSelf))
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

func readJSONFromRequest(req *http.Request, data interface{}) error {
	return json.NewDecoder(req.Body).Decode(data)
}

func getResourceIdFromUrl(req *http.Request, idKey routeKey) (int64, error) {
	idStr := chi.URLParam(req, string(idKey))

	// Special case for userId
	if idKey == userIdKey && idStr == "" {
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
