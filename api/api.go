package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/upload"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/hlog"
	"github.com/rs/zerolog/log"
)

// ---- Begin Standard Errors ----

var errMismatchedId = errors.New("id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

// ---- Begin Context Keys ----

type contextKey string

func (k contextKey) String() string {
	return "gomp context key: " + string(k)
}

const (
	currentUserIdCtxKey    = contextKey("current-user-id")
	currentUserTokenCtxKey = contextKey("current-user-token")
)

// ---- End Context Keys ----

type apiHandler struct {
	secureKeys []string
	upl        upload.Driver
	db         db.Driver
}

// NewHandler returns a new instance of http.Handler
func NewHandler(secureKeys []string, upl upload.Driver, db db.Driver) http.Handler {
	h := apiHandler{
		secureKeys: secureKeys,
		upl:        upl,
		db:         db,
	}

	r := chi.NewRouter()
	r.Use(middleware.SetHeader("Content-Type", "application/json"))
	r.Mount("/v1", HandlerWithOptions(NewStrictHandlerWithOptions(
		h,
		[]StrictMiddlewareFunc{},
		StrictHTTPServerOptions{
			RequestErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				h.Error(w, r, http.StatusBadRequest, err)
			},
			ResponseErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				h.Error(w, r, http.StatusInternalServerError, err)
			},
		}),
		ChiServerOptions{
			Middlewares: []MiddlewareFunc{h.checkScopes},
		}))
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

func (apiHandler) LogError(ctx context.Context, err error) {
	log.Ctx(ctx).UpdateContext(func(c zerolog.Context) zerolog.Context {
		return c.Err(err)
	})
}

func (h apiHandler) Error(w http.ResponseWriter, r *http.Request, status int, err error) {
	h.LogError(r.Context(), err)
	status = getStatusFromError(err, status)
	h.JSON(w, r, status, http.StatusText(status))
}

func getResourceIdFromCtx(ctx context.Context, idKey contextKey) (int64, error) {
	idVal := ctx.Value(idKey)

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
