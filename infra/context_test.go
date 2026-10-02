package infra

import (
	"testing"

	"github.com/chadweimer/gomp/models"
)

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
	token, _, err := CreateToken(userID, GetScopes(models.Editor), false)
	if err != nil {
		t.Fatalf("failed to create token: %v", err)
	}
	ctx = AddTokenToContext(ctx, token)
	actualToken := GetTokenFromContext(ctx)
	if actualToken != token {
		t.Errorf("expected valid token, got %v", actualToken)
	}
}
