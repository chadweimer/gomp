package infra

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

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
