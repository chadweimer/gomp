package api

import (
	"context"
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
		err         error
	}

	tests := []testArgs{
		{"user1", models.Viewer, db.ErrNotFound},
		{"user2", models.Viewer, errors.New("unknown error")},
		{"user3", models.Admin, nil},
		{"user4", models.Editor, nil},
		{"user5", models.Viewer, nil},
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
			resp, err := api.Login(t.Context(), LoginRequestObject{Body: &Credentials{Username: test.username, Password: "password"}})

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

				err := checkToken(got.Headers.SetCookie, api.secureKeys[0], expectedUserID, expectedScopes, test.accessLevel)
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
		err         error
	}

	tests := []testArgs{
		{"user1", models.Viewer, db.ErrNotFound},
		{"user2", models.Viewer, errors.New("unknown error")},
		{"user3", models.Admin, nil},
		{"user4", models.Editor, nil},
		{"user5", models.Viewer, nil},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userDriver := getMockUsersAPI(ctrl)
			expectedUserID := int64(i)
			expectedScopes := infra.GetScopes(test.accessLevel)
			ctx := context.WithValue(t.Context(), currentUserIDCtxKey, expectedUserID)
			if test.err != nil {
				userDriver.EXPECT().Read(ctx, gomock.Any()).Return(nil, test.err)
			} else {
				userDriver.EXPECT().Read(ctx, gomock.Any()).Return(
					&db.UserWithPasswordHash{
						User: models.User{
							ID:          &expectedUserID,
							Username:    test.username,
							AccessLevel: test.accessLevel,
						},
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

				err := checkToken(got.Headers.SetCookie, api.secureKeys[0], expectedUserID, expectedScopes, test.accessLevel)
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
		t.Fatal("cookie string is nil")
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
		dbError             error
		tokenIncludesScopes bool
		wantErr             bool
	}

	tests := []testArgs{
		{
			name:                "Admin access required, user is admin",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
		},
		{
			name:                "Admin access required, user is editor",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
			wantErr:             true,
		},
		{
			name:                "Admin access required, user is viewer",
			requiredScopes:      []string{string(models.Admin)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			wantErr:             true,
		},
		{
			name:                "Editor access required, user is admin",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
		},
		{
			name:                "Editor access required, user is editor",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
		},
		{
			name:                "Editor access required, user is viewer",
			requiredScopes:      []string{string(models.Editor)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			wantErr:             true,
		},
		{
			name:                "Viewer access required, user is admin",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(1)), AccessLevel: models.Admin},
			tokenIncludesScopes: true,
		},
		{
			name:                "Viewer access required, user is editor",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(2)), AccessLevel: models.Editor},
			tokenIncludesScopes: true,
		},
		{
			name:                "Viewer access required, user is viewer",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
		},
		{
			name:                "Viewer access required, user is viewer, token missing scopes",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(3)), AccessLevel: models.Viewer},
			tokenIncludesScopes: false,
			wantErr:             true,
		},
		{
			name:           "Viewer access required, no user",
			requiredScopes: []string{string(models.Viewer)},
			user:           nil,
			wantErr:        true,
		},
		{
			name:                "Database error when reading user",
			requiredScopes:      []string{string(models.Viewer)},
			user:                &models.User{ID: new(int64(4)), AccessLevel: models.Viewer},
			tokenIncludesScopes: true,
			dbError:             errors.New("database error"),
			wantErr:             true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			_, userDriver := getMockUsersAPI(ctrl)
			if test.user != nil && test.tokenIncludesScopes {
				userDriver.EXPECT().Read(gomock.Any(), gomock.Any()).Return(&db.UserWithPasswordHash{User: *test.user}, test.dbError)
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

			err := checkScopes(t.Context(), req, test.requiredScopes, secureKeys, userDriver)

			if (err != nil) != test.wantErr {
				t.Errorf("expected error: %v, got: %v", test.wantErr, err)
			}
		})
	}
}

func checkToken(cookieStr *string, key string, expectedUserID int64, expectedScopes []string, accessLevel models.AccessLevel) error {
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

	claims, ok := token.Claims.(*infra.GompClaims)

	if !ok {
		return errors.New("invalid claims")
	}
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
	if !claims.ExpiresAt.After(claims.IssuedAt.Time) {
		return errors.New("token expires before issue date")
	}

	if claims.NotBefore != nil && !claims.ExpiresAt.Time.After(claims.NotBefore.Time) {
		return errors.New("token expires before validity date")
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
