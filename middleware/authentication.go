package middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
)

// Authenticate is a middleware that inspects the request for an authentication token,
// retrieves the associated user from the database, and adds both to the request context.
// If the token is missing or invalid, or the user cannot be found, the request continues
// without user/token in context, leaving enforcement to downstream scope verification.
func Authenticate(secureKeys []string, dbDriver db.UserDriver) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, token, err := infra.IsAuthenticated(r.Context(), r, secureKeys)
			if err == nil && userID != nil {
				user, err := dbDriver.Read(r.Context(), *userID)
				if err == nil && user != nil {
					ctx := infra.AddUserToContext(r.Context(), &user.User)
					ctx = infra.AddTokenToContext(ctx, token)
					r = r.WithContext(ctx)
				} else if !errors.Is(err, db.ErrNotFound) {
					infra.GetLoggerFromContext(r.Context()).Error("Error retrieving user info", "error", err)
					// TODO: Return an error here?
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// AutoRefreshToken is a middleware that checks if the authentication token in context
// should be automatically refreshed (either near expiration for Remember Me tokens, or
// due to access level changes), updates the response cookie, and updates the token in the request context.
func AutoRefreshToken(secureKeys []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip authentication endpoints that manage tokens/cookies themselves
			path := r.URL.Path
			if path == "/auth" || strings.HasPrefix(path, "/auth/") ||
				path == "/api/v1/auth" || strings.HasPrefix(path, "/api/v1/auth/") {
				next.ServeHTTP(w, r)
				return
			}

			user := infra.GetUserFromContext(r.Context())
			token := infra.GetTokenFromContext(r.Context())
			if user != nil && token != nil && user.ID != nil {
				if claims, ok := token.Claims.(*infra.GompClaims); ok {
					shouldRefresh, extendExpiration := infra.ShouldRefreshToken(claims, user)
					if shouldRefresh {
						var (
							tokenStr  string
							expiresAt *time.Time
							err       error
						)
						scopes := infra.GetScopes(user.AccessLevel)
						if extendExpiration {
							tokenStr, expiresAt, err = infra.CreateToken(*user.ID, scopes, secureKeys, claims.RememberMe)
						} else {
							tokenStr, expiresAt, err = infra.CreateTokenWithExpiration(*user.ID, scopes, secureKeys, claims.RememberMe, time.Now(), claims.ExpiresAt.Time)
						}

						if err == nil {
							http.SetCookie(w, infra.CreateAuthCookie(tokenStr, *expiresAt))
							if newToken, err := infra.ParseToken(tokenStr, secureKeys[0]); err == nil {
								r = r.WithContext(infra.AddTokenToContext(r.Context(), newToken))
							}
						} else {
							infra.GetLoggerFromContext(r.Context()).Error("Error auto-refreshing token", "error", err)
						}
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
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

			claims, ok := token.Claims.(*infra.GompClaims)
			if !ok || len(claims.Scopes) == 0 {
				w.WriteHeader(http.StatusForbidden)
				return
			}

			if err := infra.CheckScopes(requiredScopes, claims); err != nil {
				w.WriteHeader(http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
