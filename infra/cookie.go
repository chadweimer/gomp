package infra

import (
	"errors"
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

// IsAuthenticated checks if the user is authenticated and returns the user, JWT token, and any error encountered.
func IsAuthenticated(r *http.Request, tokenHandler *TokenHandler) (*int64, *JwtToken, error) {
	token, err := getAuthTokenFromRequest(r, tokenHandler)
	if err != nil {
		return nil, nil, err
	}

	if len(token.TypedClaims.Scopes) == 0 {
		return nil, nil, ErrMissingScopes
	}

	userID, err := token.TypedClaims.GetUserID()
	if err != nil {
		return nil, nil, err
	}

	return &userID, token, nil
}

func getAuthTokenFromRequest(r *http.Request, tokenHandler *TokenHandler) (*JwtToken, error) {
	cookie, err := GetAuthCookieFromRequest(r)
	if err != nil {
		if errors.Is(err, http.ErrNoCookie) {
			return nil, errors.New("authorization cookie missing")
		}
		return nil, errors.New("error retrieving auth cookie")
	}
	tokenStr := cookie.Value

	return tokenHandler.Parse(tokenStr)
}
