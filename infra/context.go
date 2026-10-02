package infra

import (
	"context"

	"github.com/chadweimer/gomp/models"
)

const (
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
func AddTokenToContext(ctx context.Context, token *JwtToken) context.Context {
	return context.WithValue(ctx, currentTokenCtxKey, token)
}

// GetTokenFromContext retrieves the JWT token from the context, if it exists.
func GetTokenFromContext(ctx context.Context) *JwtToken {
	if token, ok := ctx.Value(currentTokenCtxKey).(*JwtToken); ok {
		return token
	}
	return nil
}
