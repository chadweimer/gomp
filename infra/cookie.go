package infra

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
)

const (
	cookieName         = "auth_token"
	currentUserCtxKey  = ContextKey("current-user")
	currentTokenCtxKey = ContextKey("current-token")
)

// AddUserToContext adds the user to the context.
func AddUserToContext(ctx context.Context, user *models.User) context.Context {
	return context.WithValue(ctx, currentUserCtxKey, user)
}

// GetUserFromContext retrieves the user from the context, if it exists.
func GetUserFromContext(ctx context.Context) *models.User {
	if user, ok := ctx.Value(currentUserCtxKey).(*models.User); ok {
		return user
	}
	return nil
}

// AddTokenToContext adds the JWT token to the context.
func AddTokenToContext(ctx context.Context, token *jwt.Token) context.Context {
	return context.WithValue(ctx, currentTokenCtxKey, token)
}

// GetTokenFromContext retrieves the JWT token from the context, if it exists.
func GetTokenFromContext(ctx context.Context) *jwt.Token {
	if token, ok := ctx.Value(currentTokenCtxKey).(*jwt.Token); ok {
		return token
	}
	return nil
}

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
func IsAuthenticated(ctx context.Context, r *http.Request, secureKeys []string) (*int64, *jwt.Token, error) {
	logger := GetLoggerFromContext(ctx)

	token, err := getAuthTokenFromRequest(r, secureKeys, logger)
	if err != nil {
		return nil, nil, err
	}

	claims, ok := token.Claims.(*GompClaims)
	if !ok || len(claims.Scopes) == 0 {
		return nil, nil, ErrMissingScopes
	}

	userID, err := GetUserIDFromClaims(claims.RegisteredClaims, logger)
	if err != nil {
		return nil, nil, err
	}

	return &userID, token, nil
}

func getAuthTokenFromRequest(r *http.Request, secureKeys []string, logger *slog.Logger) (*jwt.Token, error) {
	cookie, err := GetAuthCookieFromRequest(r)
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
		token, err := ParseToken(tokenStr, key)
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
