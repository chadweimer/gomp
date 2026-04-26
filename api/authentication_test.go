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
				typedResp, ok := resp.(Login200JSONResponse)
				if !ok {
					t.Fatalf("invalid response: %v", resp)
				}

				err := checkToken(typedResp.Headers.SetCookie, api.secureKeys[0], expectedUserID, expectedScopes, test.accessLevel)
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
				typedResp, ok := resp.(RefreshToken200JSONResponse)
				if !ok {
					t.Fatalf("invalid response: %v", resp)
				}

				err := checkToken(typedResp.Headers.SetCookie, api.secureKeys[0], expectedUserID, expectedScopes, test.accessLevel)
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

	typedResp, ok := resp.(Logout204Response)
	if !ok {
		t.Fatalf("invalid response: %v", resp)
	}

	cookieStr := typedResp.Headers.SetCookie
	cookie, err := http.ParseSetCookie(cookieStr)
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

func checkToken(cookieStr string, key string, expectedUserID int64, expectedScopes []string, accessLevel models.AccessLevel) error {
	cookie, err := http.ParseSetCookie(cookieStr)
	if err != nil {
		return fmt.Errorf("failed to parse cookie: %w", err)
	}
	tokenStr := cookie.Value
	token, err := infra.ParseToken(tokenStr, key)
	if err != nil {
		return fmt.Errorf("failed to parse token in respose: %w", err)
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
