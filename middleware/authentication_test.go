package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
)

func Test_Authenticate(t *testing.T) {
	secureKeys := []string{"secure-key"}
	userID := int64(10)
	user := &models.User{
		ID:          &userID,
		Username:    "user1",
		AccessLevel: models.Viewer,
	}

	t.Run("Valid token and user exists", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		userDriver := dbmock.NewMockUserDriver(ctrl)
		userDriver.EXPECT().Read(gomock.Any(), userID).Return(&db.UserWithPasswordHash{User: *user}, nil)

		token, err := infra.CreateToken(userID, infra.GetScopes(models.Viewer), false)
		if err != nil {
			t.Fatalf("failed to create token: %v", err)
		}
		tokenStr, err := infra.SignToken(token.Token, secureKeys)
		if err != nil {
			t.Fatalf("failed to sign token: %v", err)
		}

		req := httptest.NewRequest("GET", "http://example.com/recipes", nil)
		req.AddCookie(&http.Cookie{Name: "auth_token", Value: tokenStr})

		var capturedUser *models.User
		var capturedTokenValid bool
		next := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			capturedUser = infra.GetUserFromContext(r.Context())
			if tok := infra.GetTokenFromContext(r.Context()); tok != nil {
				capturedTokenValid = tok.Valid
			}
		})

		handler := Authenticate(secureKeys, userDriver)(next)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if capturedUser == nil || capturedUser.ID == nil || *capturedUser.ID != userID {
			t.Errorf("expected user ID %d in context, got %v", userID, capturedUser)
		}
		if !capturedTokenValid {
			t.Error("expected valid token in context")
		}
	})

	t.Run("User not found in DB", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		userDriver := dbmock.NewMockUserDriver(ctrl)
		userDriver.EXPECT().Read(gomock.Any(), userID).Return(nil, db.ErrNotFound)

		token, err := infra.CreateToken(userID, infra.GetScopes(models.Viewer), false)
		if err != nil {
			t.Fatalf("failed to create token: %v", err)
		}
		tokenStr, err := infra.SignToken(token.Token, secureKeys)
		if err != nil {
			t.Fatalf("failed to sign token: %v", err)
		}

		req := httptest.NewRequest("GET", "http://example.com/recipes", nil)
		req.AddCookie(&http.Cookie{Name: "auth_token", Value: tokenStr})

		var capturedUser *models.User
		next := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			capturedUser = infra.GetUserFromContext(r.Context())
		})

		handler := Authenticate(secureKeys, userDriver)(next)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if capturedUser != nil {
			t.Errorf("expected nil user in context, got %v", capturedUser)
		}
	})

	t.Run("DB error", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		userDriver := dbmock.NewMockUserDriver(ctrl)
		userDriver.EXPECT().Read(gomock.Any(), userID).Return(nil, errors.New("db connection failure"))

		token, err := infra.CreateToken(userID, infra.GetScopes(models.Viewer), false)
		if err != nil {
			t.Fatalf("failed to create token: %v", err)
		}
		tokenStr, err := infra.SignToken(token.Token, secureKeys)
		if err != nil {
			t.Fatalf("failed to sign token: %v", err)
		}

		req := httptest.NewRequest("GET", "http://example.com/recipes", nil)
		req.AddCookie(&http.Cookie{Name: "auth_token", Value: tokenStr})

		var capturedUser *models.User
		next := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			capturedUser = infra.GetUserFromContext(r.Context())
		})

		handler := Authenticate(secureKeys, userDriver)(next)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if capturedUser != nil {
			t.Errorf("expected nil user in context, got %v", capturedUser)
		}
	})

	t.Run("No auth cookie", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		userDriver := dbmock.NewMockUserDriver(ctrl)

		req := httptest.NewRequest("GET", "http://example.com/recipes", nil)

		var capturedUser *models.User
		next := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			capturedUser = infra.GetUserFromContext(r.Context())
		})

		handler := Authenticate(secureKeys, userDriver)(next)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if capturedUser != nil {
			t.Errorf("expected nil user in context, got %v", capturedUser)
		}
	})
}

func Test_AutoRefreshToken(t *testing.T) {
	secureKeys := []string{"secure-key"}
	userID := int64(10)
	user := &models.User{
		ID:          &userID,
		Username:    "user1",
		AccessLevel: models.Viewer,
	}

	t.Run("Near expiration with RememberMe", func(t *testing.T) {
		// Token issued 8 days ago, expires in 6 days (out of 14 days)
		now := time.Now()
		issuedAt := now.Add(-8 * 24 * time.Hour)
		expiresAt := now.Add(6 * 24 * time.Hour)
		tok, err := infra.CreateTokenWithExpiration(userID, infra.GetScopes(models.Viewer), true, issuedAt, expiresAt)
		if err != nil {
			t.Fatalf("failed to create token: %v", err)
		}

		req := httptest.NewRequest("GET", "http://example.com/api/v1/recipes", nil)
		ctx := infra.AddUserToContext(req.Context(), user)
		ctx = infra.AddTokenToContext(ctx, tok)
		req = req.WithContext(ctx)

		var updatedTokenExpiresAt time.Time
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			updatedToken := infra.GetTokenFromContext(r.Context())
			if updatedToken != nil {
				updatedTokenExpiresAt = updatedToken.TypedClaims.ExpiresAt.Time
			}
			w.WriteHeader(http.StatusOK)
		})

		rr := httptest.NewRecorder()
		handler := AutoRefreshToken(secureKeys)(next)
		handler.ServeHTTP(rr, req)

		// Assert cookie was set
		cookies := rr.Result().Cookies()
		var authCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == "auth_token" {
				authCookie = c
				break
			}
		}
		if authCookie == nil {
			t.Fatal("expected auth_token Set-Cookie header")
		}
		// Refreshed token should have new 14-day expiration
		if time.Until(authCookie.Expires) < 13*24*time.Hour {
			t.Errorf("expected cookie expiration around 14 days, got %v", time.Until(authCookie.Expires))
		}
		if time.Until(updatedTokenExpiresAt) < 13*24*time.Hour {
			t.Errorf("expected context token expiration around 14 days, got %v", time.Until(updatedTokenExpiresAt))
		}
	})

	t.Run("Near expiration without RememberMe (no refresh)", func(t *testing.T) {
		now := time.Now()
		issuedAt := now.Add(-16 * time.Hour)
		expiresAt := now.Add(8 * time.Hour)
		tok, _ := infra.CreateTokenWithExpiration(userID, infra.GetScopes(models.Viewer), false, issuedAt, expiresAt)

		req := httptest.NewRequest("GET", "http://example.com/api/v1/recipes", nil)
		ctx := infra.AddUserToContext(req.Context(), user)
		ctx = infra.AddTokenToContext(ctx, tok)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
		AutoRefreshToken(secureKeys)(next).ServeHTTP(rr, req)

		if len(rr.Result().Cookies()) > 0 {
			t.Errorf("expected no Set-Cookie header, got %d cookies", len(rr.Result().Cookies()))
		}
	})

	t.Run("Access level changed (refreshes scopes, retains expiration)", func(t *testing.T) {
		// User in DB is Admin, but token has Viewer scopes
		adminUser := &models.User{
			ID:          &userID,
			Username:    "user1",
			AccessLevel: models.Admin,
		}
		now := time.Now()
		issuedAt := now.Add(-1 * 24 * time.Hour)
		expiresAt := now.Add(13 * 24 * time.Hour)
		tok, _ := infra.CreateTokenWithExpiration(userID, infra.GetScopes(models.Viewer), true, issuedAt, expiresAt)

		req := httptest.NewRequest("GET", "http://example.com/api/v1/recipes", nil)
		ctx := infra.AddUserToContext(req.Context(), adminUser)
		ctx = infra.AddTokenToContext(ctx, tok)
		req = req.WithContext(ctx)

		var updatedClaims *infra.GompClaims
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if updatedTok := infra.GetTokenFromContext(r.Context()); updatedTok != nil {
				// revive:disable-next-line:unchecked-type-assertion
				updatedClaims = updatedTok.TypedClaims
			}
			w.WriteHeader(http.StatusOK)
		})

		rr := httptest.NewRecorder()
		AutoRefreshToken(secureKeys)(next).ServeHTTP(rr, req)

		cookies := rr.Result().Cookies()
		if len(cookies) == 0 {
			t.Fatal("expected Set-Cookie header for scope update")
		}
		// Expiration should be retained (around 13 days, NOT 14 days)
		if updatedClaims == nil {
			t.Fatal("expected updated token in context")
		}
		if !updatedClaims.ExpiresAt.Time.Equal(expiresAt.Truncate(time.Second)) {
			t.Errorf("expected retained expiration %v, got %v", expiresAt.Truncate(time.Second), updatedClaims.ExpiresAt.Time)
		}
		// Scopes should now include Admin
		adminScopeFound := false
		for _, s := range updatedClaims.Scopes {
			if s == string(models.Admin) {
				adminScopeFound = true
				break
			}
		}
		if !adminScopeFound {
			t.Errorf("expected Admin scope in refreshed token, got %v", updatedClaims.Scopes)
		}
	})

	t.Run("Skip refresh on /auth endpoints", func(t *testing.T) {
		now := time.Now()
		issuedAt := now.Add(-8 * 24 * time.Hour)
		expiresAt := now.Add(6 * 24 * time.Hour)
		tok, _ := infra.CreateTokenWithExpiration(userID, infra.GetScopes(models.Viewer), true, issuedAt, expiresAt)

		for _, path := range []string{"/auth", "/auth/login", "/api/v1/auth"} {
			req := httptest.NewRequest("GET", "http://example.com"+path, nil)
			ctx := infra.AddUserToContext(req.Context(), user)
			ctx = infra.AddTokenToContext(ctx, tok)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusOK)
			})
			AutoRefreshToken(secureKeys)(next).ServeHTTP(rr, req)

			if len(rr.Result().Cookies()) > 0 {
				t.Errorf("expected no Set-Cookie for path %s", path)
			}
		}
	})
}

func Test_VerifyScopes(t *testing.T) {
	type testArgs struct {
		name           string
		requiredScopes []string
		user           *models.User
		tokenScopes    []string
		hasAuth        bool
		expectStatus   int
	}

	tests := []testArgs{
		{
			name:           "Admin access required, user is admin",
			requiredScopes: []string{string(models.Admin)},
			user:           &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenScopes:    infra.GetScopes(models.Admin),
			hasAuth:        true,
			expectStatus:   http.StatusOK,
		},
		{
			name:           "Admin access required, user is editor",
			requiredScopes: []string{string(models.Admin)},
			user:           &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenScopes:    infra.GetScopes(models.Editor),
			hasAuth:        true,
			expectStatus:   http.StatusForbidden,
		},
		{
			name:           "Viewer access required, user is viewer",
			requiredScopes: []string{string(models.Viewer)},
			user:           &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenScopes:    infra.GetScopes(models.Viewer),
			hasAuth:        true,
			expectStatus:   http.StatusOK,
		},
		{
			name:           "Viewer access required, unauthenticated",
			requiredScopes: []string{string(models.Viewer)},
			hasAuth:        false,
			expectStatus:   http.StatusUnauthorized,
		},
		{
			name:           "Viewer access required, token missing scopes",
			requiredScopes: []string{string(models.Viewer)},
			user:           &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenScopes:    []string{},
			hasAuth:        true,
			expectStatus:   http.StatusForbidden,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "http://example.com/recipes", nil)
			if test.hasAuth {
				tok, _ := infra.CreateToken(*test.user.ID, test.tokenScopes, false)
				ctx := infra.AddUserToContext(req.Context(), test.user)
				ctx = infra.AddTokenToContext(ctx, tok)
				req = req.WithContext(ctx)
			}

			rr := httptest.NewRecorder()
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			VerifyScopes(test.requiredScopes)(next).ServeHTTP(rr, req)

			if rr.Code != test.expectStatus {
				t.Errorf("expected status %d, got %d", test.expectStatus, rr.Code)
			}
		})
	}
}
