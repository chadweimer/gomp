package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/chadweimer/gomp/middleware"
)

func TestMaintenance_Inactive(t *testing.T) {
	active := false
	mw := middleware.Maintenance(func() bool { return active }, "/api/v1/tasks")

	nextCalled := false
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/recipes", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !nextCalled {
		t.Error("expected next handler to be called when maintenance is inactive")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", rec.Code)
	}
}

func TestMaintenance_Active_NonExempt(t *testing.T) {
	active := true
	mw := middleware.Maintenance(func() bool { return active }, "/api/v1/tasks")

	nextCalled := false
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/recipes", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if nextCalled {
		t.Error("expected next handler NOT to be called when maintenance is active on non-exempt route")
	}
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503 Service Unavailable, got %d", rec.Code)
	}
	if rec.Header().Get("Retry-After") != "5" {
		t.Errorf("expected Retry-After 5, got %q", rec.Header().Get("Retry-After"))
	}
}

func TestMaintenance_Active_Exempt(t *testing.T) {
	active := true
	mw := middleware.Maintenance(func() bool { return active }, "/api/v1/tasks", "/api/v1/auth")

	nextCalled := false
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/123", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !nextCalled {
		t.Error("expected exempt path to proceed to next handler")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", rec.Code)
	}
}
