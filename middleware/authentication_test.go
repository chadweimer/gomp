package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/models"
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
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Admin access required, user is editor",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusForbidden,
		},
		{
			name:                "Admin access required, user is viewer",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusForbidden,
		},
		{
			name:                "Editor access required, user is admin",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Editor access required, user is editor",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Editor access required, user is viewer",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusForbidden,
		},
		{
			name:                "Viewer access required, user is admin",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Viewer access required, user is editor",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Viewer access required, user is viewer",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			expectStatus:        http.StatusOK,
		},
		{
			name:                "Viewer access required, user is viewer, token missing scopes",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
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

func getMockUsersAPI(ctrl *gomock.Controller) *dbmock.MockUserDriver {
	dbDriver := dbmock.NewMockDriver(ctrl)
	userDriver := dbmock.NewMockUserDriver(ctrl)
	dbDriver.EXPECT().Users().AnyTimes().Return(userDriver)

	return userDriver
}
