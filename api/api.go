package api

//go:generate go tool oapi-codegen --config cfg.yaml ../openapi.yaml

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/infra"
)

// ---- Begin Standard Errors ----

var errMismatchedID = errors.New("id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

// ---- Begin Context Keys ----

const currentUserIDCtxKey = infra.ContextKey("current-user-id")

// ---- End Context Keys ----

type apiHandler struct {
	secureKeys []string
	fs         fileaccess.Driver
	upl        *fileaccess.ImageUploader
	db         db.Driver
}

// NewHandler returns a new instance of http.Handler
func NewHandler(secureKeys []string, upl *fileaccess.ImageUploader, drDriver db.Driver, fs fileaccess.Driver) (http.Handler, error) {
	h := apiHandler{
		secureKeys: secureKeys,
		fs:         fs,
		upl:        upl,
		db:         drDriver,
	}

	spec, err := GetSpec()
	if err != nil {
		return nil, fmt.Errorf("failed to get OpenAPI spec: %v", err)
	}
	routePrefix := "/v1"

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
			BaseURL: routePrefix,
			Middlewares: []MiddlewareFunc{
				addUserIDToContext(h.secureKeys),
				verifyScopes(spec, routePrefix, h.secureKeys, h.db.Users()),
			},
			ErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				writeErrorResponse(w, r, http.StatusBadRequest, err)
			},
		}), nil
}

func writeErrorResponse(w http.ResponseWriter, r *http.Request, status int, err error) {
	infra.GetLoggerFromContext(r.Context()).Error("failure on request", "error", err)
	w.WriteHeader(status)
}

func getResourceIDFromCtx(ctx context.Context, idKey infra.ContextKey) (int64, error) {
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

func addUserIDToContext(secureKeys []string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if userID, _, err := infra.IsAuthenticated(r.Context(), r, secureKeys); err == nil {
				// Add the user's ID to the list of params
				r = r.WithContext(context.WithValue(r.Context(), currentUserIDCtxKey, *userID))
			}

			next.ServeHTTP(w, r)
		})
	}
}
