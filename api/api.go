package api

//go:generate go run github.com/deepmap/oapi-codegen/cmd/oapi-codegen@v1.11.0 --config cfg.yaml ../openapi.yaml

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/db"
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
	currentUserIdCtxKey    = &contextKey{"CurrentUserId"}
	currentUserTokenCtxKey = &contextKey{"Token"}
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
	HandlerWithOptions(h, ChiServerOptions{
		BaseRouter:  r,
		BaseURL:     "/v1",
		Middlewares: []MiddlewareFunc{h.checkScopes},
	})
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		h.Error(w, r, http.StatusNotFound, fmt.Errorf("%s is not a valid API endpoint", r.URL.Path))
	})

	return r
}

func (apiHandler) JSON(w http.ResponseWriter, r *http.Request, status int, v interface{}) {
	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(v); err != nil {
		hlog.FromRequest(r).UpdateContext(func(c zerolog.Context) zerolog.Context {
			return c.AnErr("encode-error", err).Int("original-status", status)
		})

		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(status)
	if _, err := w.Write(buf.Bytes()); err != nil {
		// We tried everything. Time to panic
		panic(err)
	}
}

func (h apiHandler) OK(w http.ResponseWriter, r *http.Request, v interface{}) {
	h.JSON(w, r, http.StatusOK, v)
}

func (apiHandler) NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) Created(w http.ResponseWriter, r *http.Request, v interface{}) {
	h.JSON(w, r, http.StatusCreated, v)
}

func (apiHandler) CreatedWithLocation(w http.ResponseWriter, location string) {
	w.Header().Set("Location", location)
	w.WriteHeader(http.StatusCreated)
}

func (h apiHandler) Error(w http.ResponseWriter, r *http.Request, status int, err error) {
	hlog.FromRequest(r).UpdateContext(func(c zerolog.Context) zerolog.Context {
		return c.Err(err)
	})
	status = getStatusFromError(err, status)
	h.JSON(w, r, status, http.StatusText(status))
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
