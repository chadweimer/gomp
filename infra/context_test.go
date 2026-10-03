package infra

import (
	"context"
	"log/slog"
	"testing"

	"github.com/chadweimer/gomp/models"
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

func Test_UserAndTokenContext(t *testing.T) {
	ctx := t.Context()

	// Initial state - should be nil
	if user := GetUserFromContext(ctx); user != nil {
		t.Errorf("expected nil user, got %v", user)
	}
	if token := GetTokenFromContext(ctx); token != nil {
		t.Errorf("expected nil token, got %v", token)
	}

	// Add user and retrieve
	userID := int64(42)
	expectedUser := &models.User{
		ID:          &userID,
		Username:    "testuser",
		AccessLevel: models.Editor,
	}
	ctx = AddUserToContext(ctx, expectedUser)
	actualUser := GetUserFromContext(ctx)
	if actualUser == nil || actualUser.ID == nil || *actualUser.ID != userID {
		t.Errorf("expected user with ID %d, got %v", userID, actualUser)
	}

	// Add token and retrieve
	tokenHandler := NewTokenHandler([]string{})
	token, err := tokenHandler.Generate(userID, GetScopes(models.Editor), false)
	if err != nil {
		t.Fatalf("failed to create token: %v", err)
	}
	ctx = AddTokenToContext(ctx, token)
	actualToken := GetTokenFromContext(ctx)
	if actualToken != token {
		t.Errorf("expected valid token, got %v", actualToken)
	}
}
