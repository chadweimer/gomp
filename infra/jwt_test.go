package infra

import (
	"fmt"
	"testing"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

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

func Test_GompClaims_ShouldRefresh(t *testing.T) {
	now := time.Now()

	type testArgs struct {
		name                   string
		claims                 *GompClaims
		user                   *models.User
		expectShouldRefresh    bool
		expectExtendExpiration bool
	}

	tests := []testArgs{
		{
			name:                   "Nil claims",
			claims:                 nil,
			user:                   &models.User{AccessLevel: models.Viewer},
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
		{
			name: "Nil user",
			claims: &GompClaims{
				IssuedAt:   jwt.NewNumericDate(now.Add(-1 * time.Hour)),
				ExpiresAt:  jwt.NewNumericDate(now.Add(13 * 24 * time.Hour)),
				Scopes:     GetScopes(models.Viewer),
				RememberMe: true,
			},
			user:                   nil,
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
		{
			name:                   "Nil claims and user",
			claims:                 nil,
			user:                   nil,
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
		{
			name: "RememberMe true, > 50% time remaining, same scopes in same order",
			claims: &GompClaims{
				IssuedAt:   jwt.NewNumericDate(now.Add(-1 * 24 * time.Hour)), // 1 day ago
				ExpiresAt:  jwt.NewNumericDate(now.Add(13 * 24 * time.Hour)), // 13 days left out of 14
				Scopes:     GetScopes(models.Admin),                          // ["viewer", "admin", "editor"]
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Admin},
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
		{
			name: "RememberMe true, > 50% time remaining, same scopes in DIFFERENT order",
			claims: &GompClaims{
				IssuedAt:  jwt.NewNumericDate(now.Add(-1 * 24 * time.Hour)),
				ExpiresAt: jwt.NewNumericDate(now.Add(13 * 24 * time.Hour)),
				// GetScopes(models.Admin) returns ["viewer", "admin", "editor"].
				// We pass a different order ["editor", "viewer", "admin"]:
				Scopes:     jwt.ClaimStrings{string(models.Editor), string(models.Viewer), string(models.Admin)},
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Admin},
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
		{
			name: "RememberMe true, <= 50% time remaining (near expiration), same scopes in DIFFERENT order",
			claims: &GompClaims{
				RegisteredClaims: jwt.RegisteredClaims{
					IssuedAt:  jwt.NewNumericDate(now.Add(-8 * 24 * time.Hour)), // 8 days ago
					ExpiresAt: jwt.NewNumericDate(now.Add(6 * 24 * time.Hour)),  // 6 days left (<= 7 days)
				},
				Scopes:     jwt.ClaimStrings{string(models.Editor), string(models.Viewer), string(models.Admin)},
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Admin},
			expectShouldRefresh:    true,
			expectExtendExpiration: true,
		},
		{
			name: "RememberMe true, <= 50% time remaining (near expiration), same scopes in same order",
			claims: &GompClaims{
				IssuedAt:   jwt.NewNumericDate(now.Add(-8 * 24 * time.Hour)),
				ExpiresAt:  jwt.NewNumericDate(now.Add(6 * 24 * time.Hour)),
				Scopes:     GetScopes(models.Viewer),
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Viewer},
			expectShouldRefresh:    true,
			expectExtendExpiration: true,
		},
		{
			name: "RememberMe false, <= 50% time remaining, same scopes in same order (should NOT refresh)",
			claims: &GompClaims{
				IssuedAt:   jwt.NewNumericDate(now.Add(-16 * time.Hour)), // 16 hours ago
				ExpiresAt:  jwt.NewNumericDate(now.Add(8 * time.Hour)),   // 8 hours left out of 24
				Scopes:     GetScopes(models.Viewer),
				RememberMe: false,
			},
			user:                   &models.User{AccessLevel: models.Viewer},
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
		{
			name: "RememberMe false, > 50% time remaining, same scopes in DIFFERENT order",
			claims: &GompClaims{
				IssuedAt:   jwt.NewNumericDate(now.Add(-2 * time.Hour)),
				ExpiresAt:  jwt.NewNumericDate(now.Add(22 * time.Hour)),
				Scopes:     jwt.ClaimStrings{string(models.Editor), string(models.Viewer)},
				RememberMe: false,
			},
			user:                   &models.User{AccessLevel: models.Editor},
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
		{
			name: "RememberMe true, > 50% time remaining, scopes changed (upgraded to Admin)",
			claims: &GompClaims{
				IssuedAt:   jwt.NewNumericDate(now.Add(-1 * 24 * time.Hour)),
				ExpiresAt:  jwt.NewNumericDate(now.Add(13 * 24 * time.Hour)),
				Scopes:     GetScopes(models.Viewer), // only viewer
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Admin}, // now admin
			expectShouldRefresh:    true,
			expectExtendExpiration: false,
		},
		{
			name: "RememberMe false, > 50% time remaining, scopes changed",
			claims: &GompClaims{
				IssuedAt:   jwt.NewNumericDate(now.Add(-2 * time.Hour)),
				ExpiresAt:  jwt.NewNumericDate(now.Add(22 * time.Hour)),
				Scopes:     GetScopes(models.Viewer),
				RememberMe: false,
			},
			user:                   &models.User{AccessLevel: models.Editor},
			expectShouldRefresh:    true,
			expectExtendExpiration: false,
		},
		{
			name: "RememberMe true, <= 50% time remaining AND scopes changed",
			claims: &GompClaims{
				IssuedAt:   jwt.NewNumericDate(now.Add(-8 * 24 * time.Hour)),
				ExpiresAt:  jwt.NewNumericDate(now.Add(6 * 24 * time.Hour)),
				Scopes:     GetScopes(models.Viewer),
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Admin},
			expectShouldRefresh:    true,
			expectExtendExpiration: true,
		},
		{
			name: "RememberMe true, IssuedAt is nil, remaining <= 7 days (fallback duration)",
			claims: &GompClaims{
				ExpiresAt:  jwt.NewNumericDate(now.Add(6 * 24 * time.Hour)),
				Scopes:     GetScopes(models.Viewer),
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Viewer},
			expectShouldRefresh:    true,
			expectExtendExpiration: true,
		},
		{
			name: "RememberMe true, IssuedAt is nil, remaining > 7 days (fallback duration)",
			claims: &GompClaims{
				ExpiresAt:  jwt.NewNumericDate(now.Add(10 * 24 * time.Hour)),
				Scopes:     GetScopes(models.Viewer),
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Viewer},
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
		{
			name: "ExpiresAt is nil, matching scopes",
			claims: &GompClaims{
				Scopes:     GetScopes(models.Viewer),
				RememberMe: true,
			},
			user:                   &models.User{AccessLevel: models.Viewer},
			expectShouldRefresh:    false,
			expectExtendExpiration: false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			shouldRefresh, extendExpiration := test.claims.ShouldRefresh(test.user)
			if shouldRefresh != test.expectShouldRefresh {
				t.Errorf("expected shouldRefresh %v, got %v", test.expectShouldRefresh, shouldRefresh)
			}
			if extendExpiration != test.expectExtendExpiration {
				t.Errorf("expected extendExpiration %v, got %v", test.expectExtendExpiration, extendExpiration)
			}
		})
	}
}

func Test_GompClaims_GetUserID(t *testing.T) {
	type testArgs struct {
		claims      GompClaims
		expectedID  int64
		expectError bool
	}

	// Arrange
	tests := []testArgs{
		{GompClaims{Subject: "1"}, 1, false},
		{GompClaims{Subject: "A"}, -1, true},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Act
			actualID, err := test.claims.GetUserID()

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
