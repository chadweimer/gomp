package api

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/golang/mock/gomock"
	"github.com/samber/lo"
)

func Test_Authenticate(t *testing.T) {
	type authTest struct {
		username    string
		accessLevel models.AccessLevel
		err         error
	}

	// Arrange
	tests := []authTest{
		{"user1", models.Viewer, db.ErrNotFound},
		{"user2", models.Viewer, errors.New("unknown error")},
		{"user3", models.Admin, nil},
		{"user4", models.Editor, nil},
		{"user5", models.Viewer, nil},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, userDriver := getMockUsersApi(ctrl)
			expectedUserId := int64(i)
			expectedScopes := getScopes(test.accessLevel)
			if test.err != nil {
				userDriver.EXPECT().Authenticate(gomock.Any(), gomock.Any()).Return(nil, test.err)
			} else {
				userDriver.EXPECT().Authenticate(gomock.Any(), gomock.Any()).Return(
					&models.User{
						Id:          &expectedUserId,
						Username:    test.username,
						AccessLevel: test.accessLevel,
					}, nil)
			}

			// Act
			resp, err := api.Authenticate(context.Background(), AuthenticateRequestObject{Body: &Credentials{Username: test.username, Password: "password"}})

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

				token, err := parseToken(typedResp.Token, api.secureKeys[0])
				if err != nil {
					t.Fatalf("failed to parse token in respose: %v", err)
				}

				claims := token.Claims.(*gompClaims)

				userId, err := getUserIdFromClaims(claims.RegisteredClaims)
				if err != nil {
					t.Fatalf("couldn't get user id from token: %s", typedResp.Token)
				}

				if userId != expectedUserId {
					t.Fatalf("user id in token (%d) does not match expected (%d)", userId, expectedUserId)
				}

				missingExpected, extraActual := lo.Difference(expectedScopes, claims.Scopes)
				if len(missingExpected) > 0 {
					t.Errorf("access level: %s, missing %v scopes", test.accessLevel, missingExpected)
				}
				if len(extraActual) > 0 {
					t.Errorf("access level: %s, extra %v scopes", test.accessLevel, extraActual)
				}
			}
		})
	}
}

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

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
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

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
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

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Act
			actualId, err := getUserIdFromClaims(test.claims)

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("expected error: %v, received error: %v", test.expectError, err)
			}
			if actualId != test.expectedId {
				t.Errorf("expected id: %d, actual id: %d", test.expectedId, actualId)
			}
		})
	}
}

func getMockUsersApi(ctrl *gomock.Controller) (apiHandler, *dbmock.MockUserDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	userDriver := dbmock.NewMockUserDriver(ctrl)
	dbDriver.EXPECT().Users().AnyTimes().Return(userDriver)

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		upl:        upload.NewMockDriver(ctrl),
		db:         dbDriver,
	}
	return api, userDriver
}
