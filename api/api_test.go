package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
)

func Test_getResourceIDFromCtx(t *testing.T) {
	type getResourceIDFromCtxTest struct {
		key    infra.ContextKey
		val    int64
		usePtr bool
	}

	// Arrange
	tests := []getResourceIDFromCtxTest{
		{infra.ContextKey("the-item"), 10, false},
		{infra.ContextKey("the-item"), 10, true},
		{infra.ContextKey("the-item"), -1, false},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctx := t.Context()
			// Treat non-positive as not adding to context
			if test.val > 0 {
				if test.usePtr {
					ctx = context.WithValue(ctx, test.key, &test.val)
				} else {
					ctx = context.WithValue(ctx, test.key, test.val)
				}
			}

			// Act
			id, err := getResourceIDFromCtx(ctx, test.key)

			// Assert
			if err != nil && test.val > 0 {
				t.Errorf("received err: %v", err)
			} else if err == nil {
				if id != test.val {
					t.Errorf("actual: %d, expected: %d", id, test.val)
				}
			}
		})
	}
}

func Test_writeErrorResponse(t *testing.T) {
	type testArgs struct {
		code int
		err  error
	}

	// Arrange
	tests := []testArgs{
		{http.StatusConflict, errors.New("A conflict error")},
		{http.StatusBadGateway, errors.New("A bad gateway error")},
		{http.StatusInternalServerError, db.ErrNotFound},
		{http.StatusInternalServerError, errMismatchedID},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			r := httptest.NewRequest("GET", "/some/path", nil)
			w := httptest.NewRecorder()

			// Act
			writeErrorResponse(w, r, test.code, test.err)

			// Assert
			actualCode := w.Result().StatusCode
			if actualCode != test.code {
				t.Errorf("expected code: %d, received code: %d", test.code, actualCode)
			}
		})
	}
}
