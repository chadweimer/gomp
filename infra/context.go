package infra

import (
	"context"
	"log/slog"

	"github.com/chadweimer/gomp/models"
)

// ContextKey is a type for keys used in context values
type ContextKey string

const (
	logCtxKey          = ContextKey("context-logger")
	currentUserCtxKey  = ContextKey("current-user")
	currentTokenCtxKey = ContextKey("current-token")
)

// AddLoggerToContext adds the provided logger to the supplied context and returns the new context
func AddLoggerToContext(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, logCtxKey, logger)
}

// GetLoggerFromContext gets the logger from the supplied context
func GetLoggerFromContext(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(logCtxKey).(*slog.Logger); ok {
		return logger
	}
	return slog.Default()
}

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
