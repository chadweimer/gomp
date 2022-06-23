package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

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
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/hlog"
)

// ---- Begin Standard Errors ----

var errMismatchedId = errors.New("id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

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

func (h *apiHandler) JSON(w http.ResponseWriter, status int, v interface{}) {
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	if h.cfg.IsDevelopment {
		enc.SetIndent("", "  ")
	}
	enc.Encode(v)
}

func (h *apiHandler) OK(w http.ResponseWriter, v interface{}) {
	h.JSON(w, http.StatusOK, v)
}

func (h *apiHandler) NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func (h *apiHandler) Created(w http.ResponseWriter, v interface{}) {
	h.JSON(w, http.StatusCreated, v)
}

func (h *apiHandler) CreatedWithLocation(w http.ResponseWriter, location string) {
	w.Header().Set("Location", location)
	w.WriteHeader(http.StatusCreated)
}

func (h *apiHandler) Error(w http.ResponseWriter, r *http.Request, status int, err error) {
	hlog.FromRequest(r).UpdateContext(func(c zerolog.Context) zerolog.Context {
		return c.Err(err)
	})
	status = getStatusFromError(err, status)
	h.JSON(w, status, http.StatusText(status))
}

func (h *apiHandler) notFound(w http.ResponseWriter, r *http.Request) {
	h.Error(w, r, http.StatusNotFound, fmt.Errorf("%s is not a valid API endpoint", r.URL.Path))
}

func readJSONFromRequest(r *http.Request, data interface{}) error {
	return json.NewDecoder(r.Body).Decode(data)
}

func getResourceIdFromCtx(r *http.Request, idKey *contextKey) (int64, error) {
	idVal := r.Context().Value(idKey)

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

func getStatusFromError(err error, fallback int) int {
	if errors.Is(err, db.ErrNotFound) {
		return http.StatusNotFound
	}

	return fallback
}
