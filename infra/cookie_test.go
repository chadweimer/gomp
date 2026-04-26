package infra

import (
	"net/http"
	"testing"
	"time"
)

func TestCreateAuthCookie(t *testing.T) {
	type testArgs struct {
		name      string
		value     string
		expiresAt time.Time
	}

	tests := []testArgs{
		{"Nominal", "value", time.Now().Add(24 * time.Hour)},
		{"EmptyValue", "", time.Now().Add(24 * time.Hour)},
		{"PastExpiration", "expired", time.Now().Add(-24 * time.Hour)},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {

			cookie := CreateAuthCookie(test.value, test.expiresAt)

			if cookie.Name != cookieName {
				t.Errorf("expected cookie name %s, got %s", cookieName, cookie.Name)
			}
			if cookie.Value != test.value {
				t.Errorf("expected cookie value %s, got %s", test.value, cookie.Value)
			}
			if cookie.Path != "/" {
				t.Errorf("expected cookie path '/', got %s", cookie.Path)
			}
			if !cookie.Expires.Equal(test.expiresAt) {
				t.Errorf("expected cookie expiration %v, got %v", test.expiresAt, cookie.Expires)
			}
			if !cookie.HttpOnly {
				t.Error("expected HttpOnly to be true")
			}
			if cookie.SameSite != http.SameSiteStrictMode {
				t.Errorf("expected SameSite to be %v, got %v", http.SameSiteStrictMode, cookie.SameSite)
			}
		})
	}
}

func TestGetAuthCookieFromRequest(t *testing.T) {
	type testArgs struct {
		name          string
		cookieValue   string
		expectError   bool
		expectedValue string
	}

	tests := []testArgs{
		{"CookiePresent", "value", false, "value"},
		{"CookieAbsent", "", true, ""},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "http://example.com", nil)
			if test.cookieValue != "" {
				req.AddCookie(CreateAuthCookie(test.cookieValue, time.Now().Add(24*time.Hour)))
			}

			cookie, err := GetAuthCookieFromRequest(req)

			if test.expectError && err == nil {
				t.Error("expected an error but got none")
			}
			if !test.expectError && err != nil {
				t.Errorf("did not expect an error but got: %v", err)
			}
			if cookie != nil && cookie.Value != test.expectedValue {
				t.Errorf("expected cookie value %s, got %s", test.expectedValue, cookie.Value)
			}
		})
	}
}
