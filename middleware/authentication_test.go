package middleware

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"github.com/golang-jwt/jwt/v4"
	"go.uber.org/mock/gomock"
)

func Test_VerifyScopes(t *testing.T) {
	type testArgs struct {
		name                string
		requiredScopes      []string
		user                *models.User
		tokenIncludesScopes bool
		expectStatus        int
	}

	tests := []testArgs{
		{
			name:                "Admin access required, user is admin",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: utils.GetPtr[int64](1), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Admin access required, user is editor",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: utils.GetPtr[int64](2), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusForbidden,
		},
		{
			name:                "Admin access required, user is viewer",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: utils.GetPtr[int64](3), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusForbidden,
		},
		{
			name:                "Editor access required, user is admin",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: utils.GetPtr[int64](1), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Editor access required, user is editor",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: utils.GetPtr[int64](2), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Editor access required, user is viewer",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: utils.GetPtr[int64](3), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusForbidden,
		},
		{
			name:                "Viewer access required, user is admin",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: utils.GetPtr[int64](1), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Viewer access required, user is editor",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: utils.GetPtr[int64](2), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Viewer access required, user is viewer",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: utils.GetPtr[int64](3), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Viewer access required, user is viewer, token missing scopes",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: utils.GetPtr[int64](3), AccessLevel: models.Viewer},
			tokenIncludesScopes: false,
			expectStatus:        http.StatusForbidden,
		},
		{
			name:           "Viewer access required, no user",
			requiredScopes: []string{string(models.Viewer)},
			user:           nil,
			expectStatus:   http.StatusUnauthorized,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			userDriver := getMockUsersAPI(ctrl)
			if test.user != nil && test.tokenIncludesScopes {
				userDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(&db.UserWithPasswordHash{User: *test.user}, nil)
			}

			secureKeys := []string{"secure-key"}

			req, _ := http.NewRequest("GET", "http://example.com", nil)
			if test.user != nil {
				var tokenStr string
				if test.tokenIncludesScopes {
					tokenStr, _, _ = infra.CreateToken(
						*test.user.ID, infra.GetScopes(test.user.AccessLevel), secureKeys)
				} else {
					tokenStr, _, _ = infra.CreateToken(
						*test.user.ID, []string{}, secureKeys)
				}
				req.AddCookie(&http.Cookie{Name: "auth_token", Value: tokenStr})
			}

			rr := httptest.NewRecorder()
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusOK)
			})
			handler := VerifyScopes(test.requiredScopes, secureKeys, userDriver)(next)

			handler.ServeHTTP(rr, req)

			if rr.Code != test.expectStatus {
				t.Errorf("expected status: %v, received status: %v", test.expectStatus, rr.Code)
			}
		})
	}
}

func Test_isAuthenticated(t *testing.T) {
	type testArgs struct {
		name          string
		includeCookie bool
		cookieName    string
		userExists    bool
		expectError   bool
	}

	tests := []testArgs{
		{"Valid cookie and user exists", true, "auth_token", true, false},
		{"Invalid cookie name", true, "invalid-name", true, true},
		{"Valid cookie but user does not exist", true, "auth_token", false, true},
		{"No cookie provided", false, "", true, true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
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

			secureKeys := []string{"secure-key"}

			req, _ := http.NewRequest("GET", "http://example.com", nil)
			if test.includeCookie {
				tokenStr, _, _ := infra.CreateToken(*expectedUser.ID, infra.GetScopes(expectedUser.AccessLevel), secureKeys)
				req.AddCookie(&http.Cookie{Name: test.cookieName, Value: tokenStr})
			}

			// Act
			user, token, err := isAuthenticated(ctx, req, secureKeys, userDriver)

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("expected error: %v, received error: %v", test.expectError, err)
			} else if err == nil {
				if user.ID == nil || *user.ID != expectedUserID {
					t.Errorf("expected user ID: %v, received user ID: %v", expectedUserID, user.ID)
				}
				if token == nil {
					t.Error("expected token to be returned, got nil")
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
