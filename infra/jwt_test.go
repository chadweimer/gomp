package infra

import (
	"fmt"
	"log/slog"
	"testing"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

func Test_ParseToken(t *testing.T) {
	type testArgs struct {
		name           string
		tokenStr       string
		wantErr        bool
		wantScopes     jwt.ClaimStrings
		wantRememberMe bool
	}

	secureKeys := []string{"secure-key"}
	createGompToken := func(userID int64, scopes []string, rememberMe bool) string {
		token, _ := CreateToken(userID, scopes, rememberMe)
		tokenStr, _ := SignToken(token.Token, secureKeys)
		return tokenStr
	}
	createStandardToken := func(method jwt.SigningMethod, expiresDelta time.Duration) string {
		now := time.Now()
		token := jwt.NewWithClaims(method, &jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiresDelta)),
			IssuedAt:  jwt.NewNumericDate(now),
		})
		tokenStr, _ := SignToken(token, secureKeys)
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
			parsedToken, err := ParseToken(test.tokenStr, secureKeys[0])

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

func Test_GetScopes(t *testing.T) {
	type testArgs struct {
		user           models.User
		expectedScopes []string
	}

	// Arrange
	tests := []testArgs{
		{models.User{AccessLevel: models.Admin}, []string{string(models.Admin), string(models.Editor), string(models.Viewer)}},
		{models.User{AccessLevel: models.Editor}, []string{string(models.Editor), string(models.Viewer)}},
		{models.User{AccessLevel: models.Viewer}, []string{string(models.Viewer)}},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Act
			actualScopes := GetScopes(test.user.AccessLevel)

			// Assert
			missingExpected, extraActual := lo.Difference(test.expectedScopes, actualScopes)
			if len(missingExpected) > 0 {
				t.Errorf("access level: %s, missing %v scopes", test.user.AccessLevel, missingExpected)
			}
			if len(extraActual) > 0 {
				t.Errorf("access level: %s, extra %v scopes", test.user.AccessLevel, extraActual)
			}
		})
	}
}

func Test_GetUserIdFromClaims(t *testing.T) {
	type testArgs struct {
		claims      jwt.RegisteredClaims
		expectedID  int64
		expectError bool
	}

	// Arrange
	tests := []testArgs{
		{jwt.RegisteredClaims{Subject: "1"}, 1, false},
		{jwt.RegisteredClaims{Subject: "A"}, -1, true},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Act
			actualID, err := GetUserIDFromClaims(test.claims, slog.Default())

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("expected error: %v, received error: %v", test.expectError, err)
			}
			if actualID != test.expectedID {
				t.Errorf("expected id: %d, actual id: %d", test.expectedID, actualID)
			}
		})
	}
}

func Test_CheckScopes(t *testing.T) {
	type testArgs struct {
		routeScopes []string
		accessLevel models.AccessLevel
		expectError bool
	}

	tests := []testArgs{
		{[]string{string(models.Admin)}, models.Admin, false},
		{[]string{string(models.Admin)}, models.Editor, true},
		{[]string{string(models.Admin)}, models.Viewer, true},
		{[]string{string(models.Editor)}, models.Admin, false},
		{[]string{string(models.Editor)}, models.Editor, false},
		{[]string{string(models.Editor)}, models.Viewer, true},
		{[]string{string(models.Viewer)}, models.Admin, false},
		{[]string{string(models.Viewer)}, models.Editor, false},
		{[]string{string(models.Viewer)}, models.Viewer, false},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			now := time.Now()
			claims := &GompClaims{
				IssuedAt: jwt.NewNumericDate(now.AddDate(0, 0, 1)),
				Scopes:   GetScopes(test.accessLevel),
			}

			// Act
			err := CheckScopes(test.routeScopes, claims)

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("expected error: %v, received error: %v", test.expectError, err)
			}
		})
	}
}
