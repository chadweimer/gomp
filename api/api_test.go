package api

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/chadweimer/gomp/db"
)

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
