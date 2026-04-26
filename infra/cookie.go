package infra

import (
	"net/http"
	"time"
)

const cookieName = "auth_token"

// CreateAuthCookie creates a cookie with the appropriate settings to be used for authentication
func CreateAuthCookie(value string, expiresAt time.Time) *http.Cookie {
	return &http.Cookie{ // #nosec G124: Not setting Secure for now to support both HTTP and HTTPS. May revisit this in the future
		Name:     cookieName,
		Value:    value,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	}
}

// GetAuthCookieFromRequest retrieves the authentication cookie from the request, if it exists
func GetAuthCookieFromRequest(r *http.Request) (*http.Cookie, error) {
	return r.Cookie(cookieName)
}
