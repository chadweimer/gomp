package infra

import (
	"fmt"
	"log/slog"
	"testing"

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
