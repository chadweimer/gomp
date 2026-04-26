package infra

import "net/http"

const cookieName = "gomp-auth-token"

// CreateAuthCookie creates a cookie with the appropriate settings to be used for authentication
func CreateAuthCookie(value string) *http.Cookie {
	return &http.Cookie{
		Name:     cookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}
}

// CreateExpiredAuthCookie creates a cookie with the appropriate settings to expire the authentication cookie
func CreateExpiredAuthCookie() *http.Cookie {
	cookie := CreateAuthCookie("")
	cookie.MaxAge = -1
	return cookie
}

// GetAuthCookieFromRequest retrieves the authentication cookie from the request, if it exists
func GetAuthCookieFromRequest(r *http.Request) (*http.Cookie, error) {
	return r.Cookie(cookieName)
}
