package infra

import (
	"context"
	"log/slog"
)

// ContextKey is a type for keys used in context values
type ContextKey string

const logCtxKey = ContextKey("context-logger")

// AddLoggerToContext adds the provided logger to the supplied context and returns the new context
func AddLoggerToContext(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, logCtxKey, logger)
}

// GetLoggerFromContext gets the logger from the supplied context
func GetLoggerFromContext(ctx context.Context) *slog.Logger {
	logger, ok := ctx.Value(logCtxKey).(*slog.Logger)
	if !ok {
		return slog.Default()
	}

	return logger
}
