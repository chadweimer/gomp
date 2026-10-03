package infra

import (
	"testing"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

func Test_Generate(t *testing.T) {
	tokenHandler := NewTokenHandler([]string{"key1", "key2"})
	userID := int64(100)
	scopes := []string{string(models.Viewer)}

	t.Run("RememberMe true (14 days)", func(t *testing.T) {
		token, err := tokenHandler.Generate(userID, scopes, true)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if token.TypedClaims.ExpiresAt == nil {
			t.Fatal("expected non-nil expiresAt")
		}
		duration := time.Until(token.TypedClaims.ExpiresAt.Time)
		if duration < 13*24*time.Hour || duration > 15*24*time.Hour {
			t.Errorf("expected expiration around 14 days, got %v", duration)
		}
		claims, ok := token.Claims.(*GompClaims)
		if !ok {
			t.Fatal("expected claims to be *GompClaims")
		}
		if !claims.RememberMe {
			t.Error("expected claims.RememberMe to be true")
		}
	})

	t.Run("RememberMe false (24 hours)", func(t *testing.T) {
		token, err := tokenHandler.Generate(userID, scopes, false)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if token.TypedClaims.ExpiresAt == nil {
			t.Fatal("expected non-nil expiresAt")
		}
		duration := time.Until(token.TypedClaims.ExpiresAt.Time)
		if duration < 23*time.Hour || duration > 25*time.Hour {
			t.Errorf("expected expiration around 24 hours, got %v", duration)
		}
		claims, ok := token.Claims.(*GompClaims)
		if !ok {
			t.Fatal("expected claims to be *GompClaims")
		}
		if claims.RememberMe {
			t.Error("expected claims.RememberMe to be false")
		}
	})
}

func Test_GenerateWithExpiration(t *testing.T) {
	tokenHandler := NewTokenHandler([]string{"key1"})
	userID := int64(200)
	scopes := []string{string(models.Admin)}
	issuedAt := time.Now().Add(-5 * time.Hour)
	expiresAt := time.Now().Add(10 * time.Hour)

	token, err := tokenHandler.GenerateWithExpiration(userID, scopes, true, issuedAt, expiresAt)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !(token.TypedClaims.ExpiresAt.Time.Sub(expiresAt).Abs() < time.Second) {
		t.Errorf("expected expiresAt %v, got %v", expiresAt, token.TypedClaims.ExpiresAt.Time)
	}
	if err != nil {
		t.Fatalf("failed to parse token: %v", err)
	}
	claims, ok := token.Claims.(*GompClaims)
	if !ok {
		t.Fatal("expected claims to be *GompClaims")
	}
	if !claims.ExpiresAt.Time.Equal(expiresAt.Truncate(time.Second)) {
		t.Errorf("expected claims expiresAt %v, got %v", expiresAt.Truncate(time.Second), claims.ExpiresAt.Time)
	}
	if !claims.IssuedAt.Time.Equal(issuedAt.Truncate(time.Second)) {
		t.Errorf("expected claims issuedAt %v, got %v", issuedAt.Truncate(time.Second), claims.IssuedAt.Time)
	}
	if !claims.RememberMe {
		t.Error("expected RememberMe to be true")
	}
}

func Test_Parse(t *testing.T) {
	type testArgs struct {
		name           string
		tokenStr       string
		wantErr        bool
		wantScopes     jwt.ClaimStrings
		wantRememberMe bool
	}

	secureKeys := []string{"secure-key"}
	tokenHandler := NewTokenHandler(secureKeys)
	createGompToken := func(userID int64, scopes []string, rememberMe bool) string {
		token, _ := tokenHandler.Generate(userID, scopes, rememberMe)
		tokenStr, _ := tokenHandler.Sign(token.Token)
		return tokenStr
	}
	createStandardToken := func(method jwt.SigningMethod, expiresDelta time.Duration) string {
		now := time.Now()
		token := jwt.NewWithClaims(method, &jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiresDelta)),
			IssuedAt:  jwt.NewNumericDate(now),
		})
		tokenStr, _ := tokenHandler.Sign(token)
		return tokenStr
	}

	tests := []testArgs{
		{
			name:           "GompClaims, no Remember Me",
			tokenStr:       createGompToken(1, []string{"A", "B"}, false),
			wantErr:        false,
			wantScopes:     []string{"A", "B"},
			wantRememberMe: false,
		},
		{
			name:           "GompClaims, with Remember Me",
			tokenStr:       createGompToken(1, []string{"A"}, true),
			wantErr:        false,
			wantScopes:     []string{"A"},
			wantRememberMe: true,
		},
		{
			name:           "RegisteredClaims",
			tokenStr:       createStandardToken(jwt.SigningMethodHS256, time.Hour),
			wantErr:        false,
			wantScopes:     []string{},
			wantRememberMe: false,
		},
		{
			name:     "RegisteredClaims, expired",
			tokenStr: createStandardToken(jwt.SigningMethodHS256, -2*time.Hour),
			wantErr:  true,
		},
		{
			name:     "RegisteredClaims, wrong signing method",
			tokenStr: createStandardToken(jwt.SigningMethodHS384, time.Hour),
			wantErr:  true,
		},
		{
			name:     "Invalid token",
			tokenStr: "invalid-token",
			wantErr:  true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			parsedToken, err := tokenHandler.Parse(test.tokenStr)

			if test.wantErr != (err != nil) {
				t.Fatalf("unexpected error: %v", err)
			}
			if err == nil {
				if !lo.ElementsMatch(parsedToken.TypedClaims.Scopes, test.wantScopes) {
					t.Errorf("want scopes %v, got %v", test.wantScopes, parsedToken.TypedClaims.Scopes)
				}
				if parsedToken.TypedClaims.RememberMe != test.wantRememberMe {
					t.Errorf("want remember me %v, got %v", test.wantRememberMe, parsedToken.TypedClaims.RememberMe)
				}
			}
		})
	}
}
