package middleware

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"go.uber.org/mock/gomock"
)

func Test_isAuthentication(t *testing.T) {
	type testArgs struct {
		includeAuthHeader bool
		headerFmt         string
		userExists        bool
		expectError       bool
	}

	tests := []testArgs{
		{true, "Bearer %s", true, false},
		{true, "Bearer %s", false, true},
		{true, "Bearer: %s", true, true},
		{true, "Bearers %s", true, true},
		{true, "Token %s", true, true},
		{true, "%s", true, true},
		{false, "", true, true},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			expectedUserID := int64(1)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, expectedUserID)
			expectedUser := db.UserWithPasswordHash{
				User: models.User{
					ID:          &expectedUserID,
					AccessLevel: models.Admin,
				},
			}
			userDriver := getMockUsersAPI(ctrl)
			if test.userExists {
				userDriver.EXPECT().Read(ctx, gomock.Any()).AnyTimes().Return(&expectedUser, nil)
			} else {
				userDriver.EXPECT().Read(ctx, gomock.Any()).AnyTimes().Return(nil, db.ErrNotFound)
			}
			header := http.Header{}
			if test.includeAuthHeader {
				tokenStr, _ := infra.CreateToken(*expectedUser.ID, infra.GetScopes(expectedUser.AccessLevel), []string{"secure-key"})
				header.Add("Authorization", fmt.Sprintf(test.headerFmt, tokenStr))
			}
			req := &http.Request{Header: header}

			// Act
			_, _, err := isAuthenticated(ctx, req, []string{"secure-key"}, userDriver)

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("expected error: %v, received error: %v", test.expectError, err)
			} else if err == nil {
				ctxUser := ctx.Value(currentUserIDCtxKey)
				if ctxUser == nil {
					t.Error("user id missing from context")
				}
			}
		})
	}
}

func Test_checkScopes(t *testing.T) {
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
			user := models.User{AccessLevel: test.accessLevel, ModifiedAt: &now}
			claims := infra.GompClaims{
				RegisteredClaims: jwt.RegisteredClaims{IssuedAt: jwt.NewNumericDate(now.AddDate(0, 0, 1))},
				Scopes:           infra.GetScopes(test.accessLevel),
			}

			// Act
			err := checkScopes(test.routeScopes, &user, &claims)

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("expected error: %v, received error: %v", test.expectError, err)
			}
		})
	}
}

func Test_checkScopes_UserUpdated(t *testing.T) {
	type testArgs struct {
		routeScopes    []string
		issuedAtDelta  int
		accessLevel    models.AccessLevel
		newAccessLevel models.AccessLevel
		expectError    bool
	}

	tests := []testArgs{
		{[]string{string(models.Editor)}, 1, models.Admin, models.Admin, false},
		{[]string{string(models.Editor)}, 1, models.Admin, models.Editor, false},
		{[]string{string(models.Editor)}, -1, models.Admin, models.Admin, false},
		{[]string{string(models.Editor)}, -1, models.Admin, models.Editor, true},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			now := time.Now()
			user := models.User{AccessLevel: test.newAccessLevel, ModifiedAt: &now}
			claims := infra.GompClaims{
				RegisteredClaims: jwt.RegisteredClaims{IssuedAt: jwt.NewNumericDate(now.AddDate(0, 0, test.issuedAtDelta))},
				Scopes:           infra.GetScopes(test.accessLevel),
			}

			// Act
			err := checkScopes(test.routeScopes, &user, &claims)

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("expected error: %v, received error: %v", test.expectError, err)
			}
		})
	}
}

func getMockUsersAPI(ctrl *gomock.Controller) *dbmock.MockUserDriver {
	dbDriver := dbmock.NewMockDriver(ctrl)
	userDriver := dbmock.NewMockUserDriver(ctrl)
	dbDriver.EXPECT().Users().AnyTimes().Return(userDriver)

	return userDriver
}
