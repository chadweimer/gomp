package middleware

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
)

// ---- Begin Standard Errors ----

var errMissingScopes = errors.New("token had no scopes")

// ---- End Standard Errors ----

// VerifyScopes is a middleware that checks if the user is authenticated and has the required scopes to access the route
func VerifyScopes(requiredScopes []string, secureKeys []string, dbDriver db.UserDriver) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, token, err := IsAuthenticated(r.Context(), r, secureKeys, dbDriver)
			if err != nil {
				if errors.Is(err, errMissingScopes) {
					w.WriteHeader(http.StatusForbidden)
					return
				}
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			// We know there are scopes because isAuthenticated would have returned an error if there were not
			// revive:disable-next-line:unchecked-type-assertion
			claims := token.Claims.(*infra.GompClaims)
			if err := infra.CheckScopes(requiredScopes, user, claims); err != nil {
				w.WriteHeader(http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// IsAuthenticated checks if the user is authenticated and returns the user, JWT token, and any error encountered.
func IsAuthenticated(ctx context.Context, r *http.Request, secureKeys []string, dbDriver db.UserDriver) (*models.User, *jwt.Token, error) {
	logger := infra.GetLoggerFromContext(ctx)

	token, err := getAuthTokenFromRequest(r, secureKeys, logger)
	if err != nil {
		return nil, nil, err
	}

	claims, ok := token.Claims.(*infra.GompClaims)
	if !ok || len(claims.Scopes) == 0 {
		return nil, nil, errMissingScopes
	}

	userID, err := infra.GetUserIDFromClaims(claims.RegisteredClaims, logger)
	if err != nil {
		return nil, nil, err
	}

	user, err := verifyUserExists(ctx, userID, logger, dbDriver)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			err = errors.New("invalid user")
		}

		return nil, nil, err
	}

	return user, token, nil
}

func getAuthTokenFromRequest(r *http.Request, secureKeys []string, logger *slog.Logger) (*jwt.Token, error) {
	cookie, err := infra.GetAuthCookieFromRequest(r)
	if err != nil {
		if errors.Is(err, http.ErrNoCookie) {
			return nil, errors.New("authorization cookie missing")
		}
		logger.Error("Error retrieving auth cookie", "error", err)
		return nil, errors.New("error retrieving auth cookie")
	}
	tokenStr := cookie.Value

	// Try each key when validating the token
	for i, key := range secureKeys {
		token, err := infra.ParseToken(tokenStr, key)
		if err == nil {
			return token, nil
		}

		logger.Error("Failed parsing JWT token",
			"error", err,
			"key-index", i)
		if i < (len(secureKeys) - 1) {
			logger.Debug("Will try again with next key")
		}
	}

	return nil, errors.New("invalid token")
}

func verifyUserExists(ctx context.Context, userID int64, logger *slog.Logger, dbDriver db.UserDriver) (*models.User, error) {
	// Verify this is a valid user in the DB
	user, err := dbDriver.Read(ctx, userID)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return nil, err
		}

		logger.Error("Error retrieving user info", "error", err)
		return nil, errors.New("error retrieving user info")
	}

	return &user.User, nil
}
