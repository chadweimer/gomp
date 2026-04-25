package infra

import (
	"context"
	"log/slog"
	"testing"
)

func TestAddLoggerToContext(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(nil, nil))

	newCtx := AddLoggerToContext(t.Context(), logger)

	// Verify context is not nil
	if newCtx == nil {
		t.Error("expected non-nil context, got nil")
	}

	// Verify the logger is in the context
	retrievedLogger := newCtx.Value(logCtxKey)
	if retrievedLogger != logger {
		t.Error("expected logger to be in context")
	}
}

func TestGetLoggerFromContext(t *testing.T) {
	customLogger := slog.New(slog.NewTextHandler(nil, nil))

	tests := []struct {
		name string
		ctx  func(context.Context) context.Context
		want *slog.Logger
	}{
		{
			name: "WithLogger",
			ctx:  func(ctx context.Context) context.Context { return AddLoggerToContext(ctx, customLogger) },
			want: customLogger,
		},
		{
			name: "WithoutLogger",
			ctx:  func(ctx context.Context) context.Context { return ctx },
			want: slog.Default(),
		},
		{
			name: "WithWrongType",
			ctx:  func(ctx context.Context) context.Context { return context.WithValue(ctx, logCtxKey, "not a logger") },
			want: slog.Default(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetLoggerFromContext(tt.ctx(t.Context()))
			if got != tt.want {
				t.Errorf("GetLoggerFromContext() = %v, want %v", got, tt.want)
			}
		})
	}
}
