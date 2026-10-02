package api

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"testing"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
	"go.uber.org/mock/gomock"
)

func Test_Login(t *testing.T) {
	type testArgs struct {
		username    string
		accessLevel models.AccessLevel
		rememberMe  bool
		err         error
	}

	tests := []testArgs{
		{"user1", models.Viewer, false, db.ErrNotFound},
		{"user2", models.Viewer, false, errors.New("unknown error")},
		{"user3", models.Admin, false, nil},
		{"user4", models.Editor, true, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userDriver := getMockUsersAPI(ctrl)
			expectedUserID := int64(i)
			expectedScopes := infra.GetScopes(test.accessLevel)
			if test.err != nil {
				userDriver.EXPECT().Authenticate(t.Context(), gomock.Any(), gomock.Any()).Return(nil, test.err)
			} else {
				userDriver.EXPECT().Authenticate(t.Context(), gomock.Any(), gomock.Any()).Return(
					&models.User{
						ID:          &expectedUserID,
						Username:    test.username,
						AccessLevel: test.accessLevel,
					}, nil)
			}

			// Act
			resp, err := api.Login(t.Context(), LoginRequestObject{
				Body: &Credentials{
					Username:   test.username,
					Password:   "password",
					RememberMe: test.rememberMe,
				},
			})

			// Assert
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if test.err != nil {
				_, ok := resp.(Login401Response)
				if !ok {
					t.Fatalf("invalid response: %v", resp)
				}
			} else {
				got, ok := resp.(Login200JSONResponse)
				if !ok {
					t.Fatalf("invalid response: %v", resp)
				}

				expectedRememberMe := test.rememberMe
				err := checkToken(got.Headers.SetCookie, api.secureKeys[0], expectedUserID, expectedScopes, test.accessLevel, expectedRememberMe)
				if err != nil {
					t.Fatal(err.Error())
				}
			}
		})
	}
}

func Test_RefreshToken(t *testing.T) {
	type testArgs struct {
		username    string
		accessLevel models.AccessLevel
		rememberMe  bool
		err         error
	}

	tests := []testArgs{
		{"user1", models.Viewer, false, db.ErrNotFound},
		{"user2", models.Viewer, false, errors.New("unknown error")},
		{"user3", models.Admin, false, nil},
		{"user4", models.Editor, true, nil},
		{"user5", models.Viewer, true, nil},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userDriver := getMockUsersAPI(ctrl)
			expectedUserID := int64(i)
			expectedScopes := infra.GetScopes(test.accessLevel)

			user := &models.User{
				ID:          &expectedUserID,
				Username:    test.username,
				AccessLevel: test.accessLevel,
			}
			ctx := infra.AddUserToContext(t.Context(), user)

			token, err := infra.CreateToken(expectedUserID, expectedScopes, test.rememberMe)
			if err != nil {
				t.Fatalf("failed to create token: %v", err)
			}
			ctx = infra.AddTokenToContext(ctx, token)

			if test.err != nil {
				userDriver.EXPECT().Read(ctx, gomock.Any()).Return(nil, test.err)
			} else {
				userDriver.EXPECT().Read(ctx, gomock.Any()).Return(
					&db.UserWithPasswordHash{
						User: *user,
					}, nil)
			}

			// Act
			resp, err := api.RefreshToken(ctx, RefreshTokenRequestObject{})

			// Assert
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if test.err != nil {
				_, ok := resp.(RefreshToken401Response)
				if !ok {
					t.Fatalf("invalid response: %v", resp)
				}
			} else {
				got, ok := resp.(RefreshToken200JSONResponse)
				if !ok {
					t.Fatalf("invalid response: %v", resp)
				}

				err := checkToken(got.Headers.SetCookie, api.secureKeys[0], expectedUserID, expectedScopes, test.accessLevel, test.rememberMe)
				if err != nil {
					t.Fatal(err.Error())
				}
			}
		})
	}
}

func Test_Logout(t *testing.T) {
	// Arrange
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	api, _ := getMockUsersAPI(ctrl)

	// Act
	resp, err := api.Logout(t.Context(), LogoutRequestObject{})

	// Assert
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got, ok := resp.(Logout204Response)
	if !ok {
		t.Fatalf("invalid response: %v", resp)
	}

	if got.Headers.SetCookie == nil {
		t.Fatal("cookie is missing")
	}

	cookie, err := http.ParseSetCookie(*got.Headers.SetCookie)
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if cookie.Value != "" {
		t.Fatalf("expected empty cookie value, got: %s", cookie.Value)
	}
	if !cookie.Expires.Before(time.Now()) {
		t.Fatalf("expected expiration in the past, got: %s", cookie.Expires)
	}
}

func Test_checkScopes(t *testing.T) {
	type testArgs struct {
		name                string
		requiredScopes      []string
		user                *models.User
		tokenIncludesScopes bool
		hasToken            bool
		wantErr             bool
	}

	tests := []testArgs{
		{
			name:                "Admin access required, user is admin",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			hasToken:            true,
		},
		{
			name:                "Admin access required, user is editor",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			hasToken:            true,
			wantErr:             true,
		},
		{
			name:                "Admin access required, user is viewer",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			hasToken:            true,
			wantErr:             true,
		},
		{
			name:                "Editor access required, user is admin",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			hasToken:            true,
		},
		{
			name:                "Editor access required, user is editor",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			hasToken:            true,
		},
		{
			name:                "Editor access required, user is viewer",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			hasToken:            true,
			wantErr:             true,
		},
		{
			name:                "Viewer access required, user is admin",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
			hasToken:            true,
		},
		{
			name:                "Viewer access required, user is editor",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			hasToken:            true,
		},
		{
			name:                "Viewer access required, user is viewer",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			hasToken:            true,
		},
		{
			name:                "Viewer access required, user is viewer, token missing scopes",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: false,
			hasToken:            true,
			wantErr:             true,
		},
		{
			name:           "Viewer access required, no user",
			requiredScopes: []string{string(models.Viewer)},
			user:           nil,
			hasToken:       false,
			wantErr:        true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctx := t.Context()
			if test.user != nil {
				ctx = infra.AddUserToContext(ctx, test.user)
			}
			if test.hasToken && test.user != nil {
				var tokenScopes []string
				if test.tokenIncludesScopes {
					tokenScopes = infra.GetScopes(test.user.AccessLevel)
				}
				tok, _ := infra.CreateToken(*test.user.ID, tokenScopes, false)
				ctx = infra.AddTokenToContext(ctx, tok)
			}

			err := checkScopes(ctx, test.requiredScopes)

			if (err != nil) != test.wantErr {
				t.Errorf("expected error: %v, got: %v", test.wantErr, err)
			}
		})
	}
}

func checkToken(cookieStr *string, key string, expectedUserID int64, expectedScopes []string, accessLevel models.AccessLevel, expectedRememberMe bool) error {
	if cookieStr == nil {
		return errors.New("cookie string is nil")
	}

	cookie, err := http.ParseSetCookie(*cookieStr)
	if err != nil {
		return fmt.Errorf("failed to parse cookie: %w", err)
	}
	tokenStr := cookie.Value
	token, err := infra.ParseToken(tokenStr, key)
	if err != nil {
		return fmt.Errorf("failed to parse token in response: %w", err)
	}

	if !token.Valid {
		return fmt.Errorf("token parsed, but is flagged as not valid: %s", tokenStr)
	}

	claims := token.TypedClaims
	if claims.IssuedAt == nil {
		return errors.New("token is missing issue date")
	}
	if claims.IssuedAt.After(time.Now()) {
		return errors.New("token has a future issue date")
	}
	if claims.ExpiresAt == nil {
		return errors.New("token is missing expiration date")
	}
	if !claims.ExpiresAt.After(claims.IssuedAt.Time) {
		return errors.New("token expires before issue date")
	}

	if claims.NotBefore != nil && !claims.ExpiresAt.Time.After(claims.NotBefore.Time) {
		return errors.New("token expires before validity date")
	}

	if claims.RememberMe != expectedRememberMe {
		return fmt.Errorf("expected rememberMe %v, got %v", expectedRememberMe, claims.RememberMe)
	}

	expectedDuration := 24 * time.Hour
	if expectedRememberMe {
		expectedDuration = 14 * 24 * time.Hour
	}
	actualDuration := claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time)
	if actualDuration < expectedDuration-time.Minute || actualDuration > expectedDuration+time.Minute {
		return fmt.Errorf("expected token duration around %v, got %v", expectedDuration, actualDuration)
	}

	userID, err := infra.GetUserIDFromClaims(claims.RegisteredClaims, slog.Default())
	if err != nil {
		return fmt.Errorf("couldn't get user id from token: %s", tokenStr)
	}

	if userID != expectedUserID {
		return fmt.Errorf("user id in token (%d) does not match expected (%d)", userID, expectedUserID)
	}

	missingExpected, extraActual := lo.Difference(expectedScopes, claims.Scopes)
	if len(missingExpected) > 0 {
		return fmt.Errorf("access level: %s, missing %v scopes", accessLevel, missingExpected)
	}
	if len(extraActual) > 0 {
		return fmt.Errorf("access level: %s, extra %v scopes", accessLevel, extraActual)
	}

	return nil
}
