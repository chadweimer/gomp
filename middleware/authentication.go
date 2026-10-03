package middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/models"
)

// Authenticate is a middleware that inspects the request for an authentication token,
// retrieves the associated user from the database, and adds both to the request context.
// If the token is missing or invalid, or the user cannot be found, the request continues
// without user/token in context, leaving enforcement to downstream scope verification.
func Authenticate(tokenHandler *infra.TokenHandler, dbDriver db.UserDriver) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, err := tokenHandler.FromRequest(r)
			if err == nil {
				userID, userIDErr := token.TypedClaims.GetUserID()
				if userIDErr == nil {
					user, err := dbDriver.Read(r.Context(), userID)
					if err == nil && user != nil {
						ctx := infra.AddUserToContext(r.Context(), &user.User)
						ctx = infra.AddTokenToContext(ctx, token)
						r = r.WithContext(ctx)
					} else if !errors.Is(err, db.ErrNotFound) {
						infra.GetLoggerFromContext(r.Context()).Error("Error retrieving user info", "error", err)
						w.WriteHeader(http.StatusInternalServerError)
						return
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// AutoRefreshToken is a middleware that checks if the authentication token in context
// should be automatically refreshed (either near expiration for Remember Me tokens, or
// due to access level changes), updates the response cookie, and updates the token in the request context.
func AutoRefreshToken(tokenHandler *infra.TokenHandler) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip authentication endpoints that manage tokens/cookies themselves
			path := strings.TrimPrefix(r.URL.Path, "/api/v1")
			if path == "/auth" || strings.HasPrefix(path, "/auth/") {
				next.ServeHTTP(w, r)
				return
			}

			user := infra.GetUserFromContext(r.Context())
			token := infra.GetTokenFromContext(r.Context())
			if user != nil && token != nil && user.ID != nil {
				claims := token.TypedClaims
				shouldRefresh, extendExpiration := claims.ShouldRefresh(user)
				if shouldRefresh {
					var cookie *http.Cookie
					newToken, cookie, err := refreshToken(user, extendExpiration, tokenHandler, claims)
					if err == nil {
						http.SetCookie(w, cookie)
						r = r.WithContext(infra.AddTokenToContext(r.Context(), newToken))
					} else {
						infra.GetLoggerFromContext(r.Context()).Warn("Error auto-refreshing token", "error", err)
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

func refreshToken(user *models.User, extendExpiration bool, tokenHandler *infra.TokenHandler, claims *infra.GompClaims) (token *infra.JwtToken, cookie *http.Cookie, err error) {
	scopes := infra.GetScopes(user.AccessLevel)
	if extendExpiration {
		token, err = tokenHandler.Generate(*user.ID, scopes, claims.RememberMe)
	} else {
		token, err = tokenHandler.GenerateWithExpiration(*user.ID, scopes, claims.RememberMe, time.Now(), claims.ExpiresAt.Time)
	}
	if err == nil {
		cookie, err = tokenHandler.AsCookie(token)
	}

	return token, cookie, err
}

// VerifyScopes is a middleware that checks if the request context contains an authenticated user
// and token that satisfy the required scopes.
func VerifyScopes(requiredScopes []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := infra.GetTokenFromContext(r.Context())
			if token == nil {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			if err := infra.CheckScopes(requiredScopes, token.TypedClaims); err != nil {
				w.WriteHeader(http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
