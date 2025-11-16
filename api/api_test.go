package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/chadweimer/gomp/db"
)

func Test_getStatusFromError(t *testing.T) {
	type getStatusFromErrorTest struct {
		err            error
		fallbackStatus int
		expectedStatus int
	}

	// Arrange
	tests := []getStatusFromErrorTest{
		{db.ErrNotFound, http.StatusNotFound, http.StatusNotFound},
		{db.ErrNotFound, http.StatusForbidden, http.StatusNotFound},
		{db.ErrNotFound, http.StatusConflict, http.StatusNotFound},
		{fmt.Errorf("some error: %w", db.ErrNotFound), http.StatusNotFound, http.StatusNotFound},
		{fmt.Errorf("some error: %w", db.ErrNotFound), http.StatusForbidden, http.StatusNotFound},
		{fmt.Errorf("some error: %w", db.ErrNotFound), http.StatusConflict, http.StatusNotFound},
		{errMismatchedID, http.StatusBadRequest, http.StatusBadRequest},
		{errMismatchedID, http.StatusForbidden, http.StatusBadRequest},
		{errMismatchedID, http.StatusConflict, http.StatusBadRequest},
		{fmt.Errorf("some error: %w", errMismatchedID), http.StatusBadRequest, http.StatusBadRequest},
		{fmt.Errorf("some error: %w", errMismatchedID), http.StatusForbidden, http.StatusBadRequest},
		{fmt.Errorf("some error: %w", errMismatchedID), http.StatusConflict, http.StatusBadRequest},
		{errors.New("some error"), http.StatusForbidden, http.StatusForbidden},
		{errors.New("some error"), http.StatusBadRequest, http.StatusBadRequest},
		{errors.New("some error"), http.StatusInternalServerError, http.StatusInternalServerError},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Act
			if actualStatus := getStatusFromError(test.err, test.fallbackStatus); actualStatus != test.expectedStatus {
				// Assert
				t.Errorf("actual '%s' not equal to expected '%s'. err: %v, fallback: %s",
					http.StatusText(actualStatus),
					http.StatusText(test.expectedStatus),
					test.err,
					http.StatusText(test.fallbackStatus))
			}
		})
	}
}

func Test_getResourceIDFromCtx(t *testing.T) {
	type getResourceIDFromCtxTest struct {
		key    contextKey
		val    int64
		usePtr bool
	}

	// Arrange
	tests := []getResourceIDFromCtxTest{
		{contextKey("the-item"), 10, false},
		{contextKey("the-item"), 10, true},
		{contextKey("the-item"), -1, false},
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
			expectedCode := getStatusFromError(test.err, test.code)
			if actualCode != expectedCode {
				t.Errorf("expected code: %d, received code: %d", expectedCode, actualCode)
			}

			actualBodyBytes, err := io.ReadAll(w.Result().Body)
			if err != nil {
				t.Fatal(err)
			}
			actualBody := strings.TrimSpace(string(actualBodyBytes))
			expectedBody := strings.TrimSpace(fmt.Sprintf("\"%s\"", http.StatusText(expectedCode)))
			if actualBody != expectedBody {
				t.Errorf("expected: %s, received: %s", expectedBody, actualBody)
			}
		})
	}
}
