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
	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
	"go.uber.org/mock/gomock"
)

func Test_Authenticate(t *testing.T) {
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
			expectedScopes := getScopes(test.accessLevel)
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
			resp, err := api.Authenticate(t.Context(), AuthenticateRequestObject{Body: &Credentials{Username: test.username, Password: "password"}})

			// Assert
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if test.err != nil {
				_, ok := resp.(Authenticate401Response)
				if !ok {
					t.Fatalf("invalid response: %v", resp)
				}
			} else {
				typedResp, ok := resp.(Authenticate200JSONResponse)
				if !ok {
					t.Fatalf("invalid response: %v", resp)
				}

				err := checkToken(typedResp.Token, api.secureKeys[0], expectedUserID, expectedScopes, test.accessLevel)
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
			expectedScopes := getScopes(test.accessLevel)
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

				err := checkToken(typedResp.Token, api.secureKeys[0], expectedUserID, expectedScopes, test.accessLevel)
				if err != nil {
					t.Fatal(err.Error())
				}
			}
		})
	}
}

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
			api, userDriver := getMockUsersAPI(ctrl)
			if test.userExists {
				userDriver.EXPECT().Read(ctx, gomock.Any()).AnyTimes().Return(&expectedUser, nil)
			} else {
				userDriver.EXPECT().Read(ctx, gomock.Any()).AnyTimes().Return(nil, db.ErrNotFound)
			}
			header := http.Header{}
			if test.includeAuthHeader {
				tokenStr, _ := api.createToken(&expectedUser.User)
				header.Add("Authorization", fmt.Sprintf(test.headerFmt, tokenStr))
			}

			// Act
			_, _, err := api.isAuthenticated(ctx, header)

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

func Test_getScopes(t *testing.T) {
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
			actualScopes := getScopes(test.user.AccessLevel)

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
			claims := gompClaims{
				RegisteredClaims: jwt.RegisteredClaims{IssuedAt: jwt.NewNumericDate(now.AddDate(0, 0, 1))},
				Scopes:           getScopes(test.accessLevel),
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
			claims := gompClaims{
				RegisteredClaims: jwt.RegisteredClaims{IssuedAt: jwt.NewNumericDate(now.AddDate(0, 0, test.issuedAtDelta))},
				Scopes:           getScopes(test.accessLevel),
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

func Test_getUserIdFromClaims(t *testing.T) {
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
			actualID, err := getUserIDFromClaims(test.claims, slog.Default())

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

func checkToken(tokenStr string, key string, expectedUserID int64, expectedScopes []string, accessLevel models.AccessLevel) error {
	token, err := parseToken(tokenStr, key)
	if err != nil {
		return fmt.Errorf("failed to parse token in respose: %w", err)
	}

	if !token.Valid {
		return fmt.Errorf("token parsed, but is flagged as not valid: %s", tokenStr)
	}

	claims, ok := token.Claims.(*gompClaims)

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

	userID, err := getUserIDFromClaims(claims.RegisteredClaims, slog.Default())
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
