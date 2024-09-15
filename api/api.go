package api

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen --config cfg.yaml ../openapi.yaml

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/upload"
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
	upl        *upload.ImageUploader
	db         db.Driver
}

// NewHandler returns a new instance of http.Handler
func NewHandler(secureKeys []string, upl *upload.ImageUploader, db db.Driver) http.Handler {
	h := apiHandler{
		secureKeys: secureKeys,
		upl:        upl,
		db:         db,
	}

	return HandlerWithOptions(NewStrictHandlerWithOptions(
		h,
		[]StrictMiddlewareFunc{},
		StrictHTTPServerOptions{
			RequestErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				writeErrorResponse(w, r, http.StatusBadRequest, err)
			},
			ResponseErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				writeErrorResponse(w, r, http.StatusInternalServerError, err)
			},
		}),
		StdHTTPServerOptions{
			BaseURL:     "/v1",
			Middlewares: []MiddlewareFunc{h.checkScopes},
			ErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				writeErrorResponse(w, r, http.StatusBadRequest, err)
			},
		})
}

func logger(ctx context.Context) *slog.Logger {
	return middleware.GetLoggerFromContext(ctx)
}

func writeJSONResponse(w http.ResponseWriter, r *http.Request, status int, v interface{}) {
	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(v); err != nil {
		logger(r.Context()).
			With("error", err).
			With("original-status", status).
			Error("Failed to encode response")

		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(status)
	if _, err := w.Write(buf.Bytes()); err != nil {
		// We tried everything. Time to panic
		panic(err)
	}
}

func writeErrorResponse(w http.ResponseWriter, r *http.Request, status int, err error) {
	logger(r.Context()).With("error", err).Error("failure on request")
	status = getStatusFromError(err, status)
	writeJSONResponse(w, r, status, http.StatusText(status))
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
	} else if errors.Is(err, errMismatchedId) {
		return http.StatusBadRequest
	}

	return fallback
}
