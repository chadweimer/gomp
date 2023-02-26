package api

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/chadweimer/gomp/db"
)

func Test_getStatusFromError(t *testing.T) {
	type getStatusFromErrorTest struct {
		err            error
		fallbackStatus int
		expectedStatus int
	}

	var tests = []getStatusFromErrorTest{
		{db.ErrNotFound, http.StatusNotFound, http.StatusNotFound},
		{db.ErrNotFound, http.StatusForbidden, http.StatusNotFound},
		{db.ErrNotFound, http.StatusConflict, http.StatusNotFound},
		{fmt.Errorf("some error: %w", db.ErrNotFound), http.StatusNotFound, http.StatusNotFound},
		{fmt.Errorf("some error: %w", db.ErrNotFound), http.StatusForbidden, http.StatusNotFound},
		{fmt.Errorf("some error: %w", db.ErrNotFound), http.StatusConflict, http.StatusNotFound},
		{errMismatchedId, http.StatusBadRequest, http.StatusBadRequest},
		{errMismatchedId, http.StatusForbidden, http.StatusBadRequest},
		{errMismatchedId, http.StatusConflict, http.StatusBadRequest},
		{fmt.Errorf("some error: %w", errMismatchedId), http.StatusBadRequest, http.StatusBadRequest},
		{fmt.Errorf("some error: %w", errMismatchedId), http.StatusForbidden, http.StatusBadRequest},
		{fmt.Errorf("some error: %w", errMismatchedId), http.StatusConflict, http.StatusBadRequest},
		{errors.New("some error"), http.StatusForbidden, http.StatusForbidden},
		{errors.New("some error"), http.StatusBadRequest, http.StatusBadRequest},
		{errors.New("some error"), http.StatusInternalServerError, http.StatusInternalServerError},
	}

	for _, test := range tests {
		if actualStatus := getStatusFromError(test.err, test.fallbackStatus); actualStatus != test.expectedStatus {
			t.Errorf("actual '%s' not equal to expected '%s'. err: %v, fallback: %s",
				http.StatusText(actualStatus),
				http.StatusText(test.expectedStatus),
				test.err,
				http.StatusText(test.fallbackStatus))
		}
	}
}
