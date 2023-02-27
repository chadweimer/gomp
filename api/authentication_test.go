package api

import (
	"testing"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

func Test_getScopes(t *testing.T) {
	type getScopesTest struct {
		user           models.User
		expectedScopes []string
	}

	// Arrange
	tests := []getScopesTest{
		{models.User{AccessLevel: models.Admin}, []string{string(models.Admin), string(models.Editor), string(models.Viewer)}},
		{models.User{AccessLevel: models.Editor}, []string{string(models.Editor), string(models.Viewer)}},
		{models.User{AccessLevel: models.Viewer}, []string{string(models.Viewer)}},
	}

	for _, test := range tests {
		// Act
		actualScopes := getScopes(test.user.AccessLevel)

		// Assert
		missingExpected, extraActual := lo.Difference(test.expectedScopes, actualScopes)
		if len(missingExpected) > 0 {
			t.Errorf("test: %s, missing %v scopes", test.user.AccessLevel, missingExpected)
		}
		if len(extraActual) > 0 {
			t.Errorf("test: %s, extra %v scopes", test.user.AccessLevel, extraActual)
		}
	}
}

func Test_checkScopes(t *testing.T) {
	type checkScopesTest struct {
		routeScopes []string
		accessLevel models.AccessLevel
		expectError bool
	}

	// Arrange
	tests := []checkScopesTest{
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

	for _, test := range tests {
		now := time.Now()
		user := models.User{AccessLevel: test.accessLevel, ModifiedAt: &now}
		claims := gompClaims{
			RegisteredClaims: jwt.RegisteredClaims{IssuedAt: jwt.NewNumericDate(now.AddDate(0, 0, 1))},
			Scopes:           getScopes(test.accessLevel),
		}

		// Act
		err := checkScopes(test.routeScopes, &user, &claims)

		// Assert
		if (err != nil) != test.expectError {
			t.Errorf("test: %v, received error: %v", test, err)
		}
	}
}

func Test_checkScopes_UserUpdated(t *testing.T) {
	type checkScopesTest struct {
		routeScopes    []string
		issuedAtDelta  int
		accessLevel    models.AccessLevel
		newAccessLevel models.AccessLevel
		expectError    bool
	}

	// Arrange
	tests := []checkScopesTest{
		{[]string{string(models.Editor)}, 1, models.Admin, models.Admin, false},
		{[]string{string(models.Editor)}, 1, models.Admin, models.Editor, false},
		{[]string{string(models.Editor)}, -1, models.Admin, models.Admin, false},
		{[]string{string(models.Editor)}, -1, models.Admin, models.Editor, true},
	}

	for _, test := range tests {
		now := time.Now()
		user := models.User{AccessLevel: test.newAccessLevel, ModifiedAt: &now}
		claims := gompClaims{
			RegisteredClaims: jwt.RegisteredClaims{IssuedAt: jwt.NewNumericDate(now.AddDate(0, 0, test.issuedAtDelta))},
			Scopes:           getScopes(test.accessLevel),
		}

		// Act
		err := checkScopes(test.routeScopes, &user, &claims)

		// Assert
		if (err != nil) != test.expectError {
			t.Errorf("test: %v, received error: %v", test, err)
		}
	}
}

func Test_getUserIdFromClaims(t *testing.T) {
	type getUserIdFromClaimsTest struct {
		claims      jwt.RegisteredClaims
		expectedId  int64
		expectError bool
	}

	// Arrange
	tests := []getUserIdFromClaimsTest{
		{jwt.RegisteredClaims{Subject: "1"}, 1, false},
		{jwt.RegisteredClaims{Subject: "A"}, -1, true},
	}

	for _, test := range tests {
		// Act
		actualId, err := getUserIdFromClaims(test.claims)

		// Assert
		if (err != nil) != test.expectError {
			t.Errorf("test: %v, received error: %v", test, err)
		}
		if actualId != test.expectedId {
			t.Errorf("test: %v, actual id: %v", test, actualId)
		}
	}
}
