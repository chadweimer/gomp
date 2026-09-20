package middleware

import (
	"errors"
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
)

// VerifyScopes is a middleware that checks if the user is authenticated and has the required scopes to access the route
func VerifyScopes(requiredScopes []string, secureKeys []string, dbDriver db.UserDriver) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, token, err := infra.IsAuthenticated(r.Context(), r, secureKeys)
			if err != nil {
				if errors.Is(err, infra.ErrMissingScopes) {
					w.WriteHeader(http.StatusForbidden)
					return
				}
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			user, err := dbDriver.Read(r.Context(), *userID)
			if err != nil {
				if !errors.Is(err, db.ErrNotFound) {
					infra.GetLoggerFromContext(r.Context()).Error("Error retrieving user info", "error", err)
				}

				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			// We know there are scopes because isAuthenticated would have returned an error if there were not
			// revive:disable-next-line:unchecked-type-assertion
			claims := token.Claims.(*infra.GompClaims)
			if err := infra.CheckScopes(requiredScopes, &user.User, claims); err != nil {
				w.WriteHeader(http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
