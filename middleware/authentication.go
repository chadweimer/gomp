package middleware

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"reflect"
	"strings"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

// ---- Begin Context Keys ----

const currentUserIDCtxKey = infra.ContextKey("current-user-id")

// ---- End Context Keys ----

// VerifyScopes is a middleware that checks if the user is authenticated and has the required scopes to access the route
func VerifyScopes(requiredScopes []string, secureKeys []string, dbDriver db.UserDriver) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			user, token, err := isAuthenticated(ctx, r, secureKeys, dbDriver)
			if err != nil {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			// Add the user's ID to the list of params
			ctx = context.WithValue(ctx, currentUserIDCtxKey, user.ID)
			r = r.WithContext(ctx)

			claims, ok := token.Claims.(*infra.GompClaims)
			if !ok || len(claims.Scopes) == 0 {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			if err := checkScopes(requiredScopes, user, claims); err != nil {
				w.WriteHeader(http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isAuthenticated(ctx context.Context, r *http.Request, secureKeys []string, dbDriver db.UserDriver) (*models.User, *jwt.Token, error) {
	logger := infra.GetLoggerFromContext(ctx)

	token, err := getAuthTokenFromRequest(r, secureKeys, logger)
	if err != nil {
		return nil, nil, err
	}

	claims, ok := token.Claims.(*infra.GompClaims)
	if !ok || len(claims.Scopes) == 0 {
		return nil, nil, errors.New("token had no scopes")
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
	var tokenStr string
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		authHeaderParts := strings.Split(authHeader, " ")
		if len(authHeaderParts) != 2 || strings.ToLower(authHeaderParts[0]) != "bearer" {
			return nil, errors.New("authorization header must be in the form 'Bearer {token}'")
		}

		tokenStr = authHeaderParts[1]
	} else {
		cookie, err := infra.GetAuthCookieFromRequest(r)
		if err != nil {
			if errors.Is(err, http.ErrNoCookie) {
				return nil, errors.New("authorization header missing")
			}
			logger.Error("Error retrieving auth cookie", "error", err)
			return nil, errors.New("error retrieving auth cookie")
		}
		tokenStr = cookie.Value
	}

	// Try each key when validating the token
	var token *jwt.Token
	var err error
	for i, key := range secureKeys {
		token, err = infra.ParseToken(tokenStr, key)
		if err == nil {
			return token, nil
		}

		logger.Error("Failed parsing JWT token",
			"error", err,
			"key-index", i)
		if i < (len(secureKeys) + 1) {
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

func checkScopes(routeScopes []string, user *models.User, claims *infra.GompClaims) error {
	// If the route requires scopes, check them
	if len(routeScopes) > 0 && (len(routeScopes) != 1 || routeScopes[0] != "") {
		// If the user has been modified since issuing the token,
		// we need to check if the scopes are still the same
		if claims.IssuedAt.Time.Before(*user.ModifiedAt) {
			// If the scopes of the token don't match the latest scopes of the user,
			// don't proceed. The client should refresh the token and try again.
			userScopes := infra.GetScopes(user.AccessLevel)
			if !reflect.DeepEqual(userScopes, []string(claims.Scopes)) {
				return errors.New("user scopes have changed")
			}
		}

		missingScopes, _ := lo.Difference(routeScopes, claims.Scopes)
		if len(missingScopes) > 0 {
			return fmt.Errorf("missing scopes: %v", missingScopes)
		}
	}

	return nil
}
