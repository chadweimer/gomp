package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

type gompClaims struct {
	jwt.RegisteredClaims

	Scopes jwt.ClaimStrings `json:"scopes"`
}

func (h apiHandler) Authenticate(ctx context.Context, request AuthenticateRequestObject) (AuthenticateResponseObject, error) {
	credentials := request.Body
	user, err := h.db.Users().Authenticate(credentials.Username, credentials.Password)
	if err != nil {
		logger(ctx).Error("failure authenticating", "error", err)
		return Authenticate401Response{}, nil
	}

	tokenStr, err := h.createToken(user)
	if err != nil {
		return nil, err
	}

	return Authenticate200JSONResponse{Token: tokenStr, User: *user}, nil
}

func (h apiHandler) RefreshToken(ctx context.Context, _ RefreshTokenRequestObject) (RefreshTokenResponseObject, error) {
	return withCurrentUser[RefreshTokenResponseObject](ctx, RefreshToken401Response{}, func(userId int64) (RefreshTokenResponseObject, error) {
		user, err := h.db.Users().Read(userId)
		if err != nil {
			logger(ctx).Error("failure refreshing token", "error", err)
			return RefreshToken401Response{}, nil
		}

		tokenStr, err := h.createToken(&user.User)
		if err != nil {
			return nil, err
		}

		return RefreshToken200JSONResponse{Token: tokenStr, User: user.User}, nil
	})
}

func (h apiHandler) createToken(user *models.User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, gompClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().AddDate(0, 0, 14)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   strconv.FormatInt(*user.Id, 10),
		},
		Scopes: jwt.ClaimStrings(getScopes(user.AccessLevel)),
	})

	// Always sign using the 0'th key
	tokenStr, err := token.SignedString([]byte(h.secureKeys[0]))
	if err != nil {
		return "", err
	}
	return tokenStr, nil
}

func (h apiHandler) checkScopes(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		routeScopes, ok := r.Context().Value(BearerScopes).([]string)
		if ok {
			ctx := r.Context()

			user, claims, err := h.isAuthenticated(ctx, r.Header)
			if err != nil {
				writeErrorResponse(w, r, http.StatusUnauthorized, err)
				return
			}

			// Add the user's ID to the list of params
			ctx = context.WithValue(ctx, currentUserIdCtxKey, user.Id)
			r = r.WithContext(ctx)

			if err := checkScopes(routeScopes, user, claims); err != nil {
				writeErrorResponse(w, r, http.StatusForbidden, fmt.Errorf("%w, endpoint '%s'", err, r.URL.Path))
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (h apiHandler) isAuthenticated(ctx context.Context, header http.Header) (*models.User, *gompClaims, error) {
	logger := logger(ctx)

	token, err := h.getAuthTokenFromRequest(header, logger)
	if err != nil {
		return nil, nil, err
	}

	claims, ok := token.Claims.(*gompClaims)
	if !ok || len(claims.Scopes) == 0 {
		return nil, nil, errors.New("token had no scopes")
	}

	userId, err := getUserIdFromClaims(claims.RegisteredClaims, logger)
	if err != nil {
		return nil, nil, err
	}

	user, err := h.verifyUserExists(userId, logger)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			err = errors.New("invalid user")
		}

		return nil, nil, err
	}

	return user, claims, nil
}

func (h apiHandler) getAuthTokenFromRequest(header http.Header, logger *slog.Logger) (*jwt.Token, error) {
	authHeader := header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("authorization header missing")
	}

	authHeaderParts := strings.Split(authHeader, " ")
	if len(authHeaderParts) != 2 || strings.ToLower(authHeaderParts[0]) != "bearer" {
		return nil, errors.New("authorization header must be in the form 'Bearer {token}'")
	}

	tokenStr := authHeaderParts[1]

	// Try each key when validating the token
	var token *jwt.Token
	var err error
	for i, key := range h.secureKeys {
		token, err = parseToken(tokenStr, key)
		if err == nil {
			return token, nil
		}

		logger.Error("Failed parsing JWT token",
			"error", err,
			"key-index", i)
		if i < (len(h.secureKeys) + 1) {
			logger.Debug("Will try again with next key")
		}
	}

	return nil, errors.New("invalid token")
}

func (h apiHandler) verifyUserExists(userId int64, logger *slog.Logger) (*models.User, error) {
	// Verify this is a valid user in the DB
	user, err := h.db.Users().Read(userId)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return nil, err
		}

		logger.Error("Error retrieving user info", "error", err)
		return nil, errors.New("error retrieving user info")
	}

	return &user.User, nil
}

func parseToken(tokenStr, key string) (*jwt.Token, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &gompClaims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("incorrect signing method")
		}

		return []byte(key), nil
	})
	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return token, nil
}

func getScopes(accessLevel models.AccessLevel) []string {
	scopes := make([]string, 0)

	scopes = append(scopes, string(models.Viewer))
	switch accessLevel {
	case models.Admin:
		scopes = append(scopes, string(models.Admin))
		scopes = append(scopes, string(models.Editor))
	case models.Editor:
		scopes = append(scopes, string(models.Editor))
	}

	return scopes
}

func checkScopes(routeScopes []string, user *models.User, claims *gompClaims) error {
	// If the route requires scopes, check them
	if len(routeScopes) > 0 && (len(routeScopes) != 1 || routeScopes[0] != "") {
		// If the user has been modified since issuing the token,
		// we need to check if the scopes are still the same
		if claims.IssuedAt.Time.Before(*user.ModifiedAt) {
			// If the scopes of the token don't match the latest scopes of the user,
			// don't proceed. The client should refresh the token and try again.
			userScopes := getScopes(user.AccessLevel)
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

func getUserIdFromClaims(claims jwt.RegisteredClaims, logger *slog.Logger) (int64, error) {
	userId, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		logger.Error("Invalid claims", "error", err)
		return -1, errors.New("invalid claims")
	}

	return userId, nil
}

func withCurrentUser[TResponse any](ctx context.Context, invalidUserResponse TResponse, do func(userId int64) (TResponse, error)) (TResponse, error) {
	userId, err := getResourceIdFromCtx(ctx, currentUserIdCtxKey)
	if err != nil {
		logger(ctx).Error("failed to get current user from request context", "error", err)
		return invalidUserResponse, nil
	}

	return do(userId)
}
