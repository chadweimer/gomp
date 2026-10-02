package api

//go:generate go tool oapi-codegen --config cfg.yaml ../openapi.yaml

import (
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
				verifyScopes(spec, routePrefix),
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
