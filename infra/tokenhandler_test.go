package infra

import (
	"net/http"
	"testing"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

func Test_Generate(t *testing.T) {
	type testArgs struct {
		name        string
		rememberMe  bool
		minDuration time.Duration
		maxDuration time.Duration
	}

	tokenHandler := NewTokenHandler([]string{"key1", "key2"})
	userID := int64(100)
	scopes := []string{string(models.Viewer)}

	tests := []testArgs{
		{
			name:        "RememberMe true (14 days)",
			rememberMe:  true,
			minDuration: 13 * 24 * time.Hour,
			maxDuration: 15 * 24 * time.Hour,
		},
		{
			name:        "RememberMe false (24 hours)",
			rememberMe:  false,
			minDuration: 23 * time.Hour,
			maxDuration: 25 * time.Hour,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			token, err := tokenHandler.Generate(userID, scopes, test.rememberMe)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if token.TypedClaims.ExpiresAt == nil {
				t.Fatal("expected non-nil expiresAt")
			}
			duration := time.Until(token.TypedClaims.ExpiresAt.Time)
			if duration < test.minDuration || duration > test.maxDuration {
				t.Errorf("expected expiration between %v and %v, got %v", test.minDuration, test.maxDuration, duration)
			}
			claims, ok := token.Claims.(*GompClaims)
			if !ok {
				t.Fatal("expected claims to be *GompClaims")
			}
			if claims.RememberMe != test.rememberMe {
				t.Errorf("expected claims.RememberMe to be %v, got %v", test.rememberMe, claims.RememberMe)
			}
		})
	}
}

func Test_GenerateWithExpiration(t *testing.T) {
	tokenHandler := NewTokenHandler([]string{"key1"})
	userID := int64(200)
	scopes := []string{string(models.Admin)}
	issuedAt := time.Now().Add(-5 * time.Hour)
	expiresAt := time.Now().Add(10 * time.Hour)

	token, err := tokenHandler.GenerateWithExpiration(userID, scopes, true, issuedAt, expiresAt)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token.TypedClaims.ExpiresAt.Time.Sub(expiresAt).Abs() > time.Second {
		t.Errorf("expected expiresAt %v, got %v", expiresAt, token.TypedClaims.ExpiresAt.Time)
	}
	claims, ok := token.Claims.(*GompClaims)
	if !ok {
		t.Fatal("expected claims to be *GompClaims")
	}
	if !claims.ExpiresAt.Time.Equal(expiresAt.Truncate(time.Second)) {
		t.Errorf("expected claims expiresAt %v, got %v", expiresAt.Truncate(time.Second), claims.ExpiresAt.Time)
	}
	if !claims.IssuedAt.Time.Equal(issuedAt.Truncate(time.Second)) {
		t.Errorf("expected claims issuedAt %v, got %v", issuedAt.Truncate(time.Second), claims.IssuedAt.Time)
	}
	if !claims.RememberMe {
		t.Error("expected RememberMe to be true")
	}
}

func Test_Parse(t *testing.T) {
	type testArgs struct {
		name           string
		tokenStr       string
		wantErr        bool
		wantScopes     jwt.ClaimStrings
		wantRememberMe bool
	}

	secureKeys := []string{"secure-key"}
	tokenHandler := NewTokenHandler(secureKeys)
	createGompToken := func(userID int64, scopes []string, rememberMe bool) string {
		token, _ := tokenHandler.Generate(userID, scopes, rememberMe)
		tokenStr, _ := tokenHandler.Sign(token.Token)
		return tokenStr
	}
	createGompTokenWithExpiration := func(userID int64, scopes []string, rememberMe bool, issuedAt, expiresAt time.Time) string {
		token, _ := tokenHandler.GenerateWithExpiration(userID, scopes, rememberMe, issuedAt, expiresAt)
		tokenStr, _ := tokenHandler.Sign(token.Token)
		return tokenStr
	}
	createStandardToken := func(method jwt.SigningMethod, expiresDelta time.Duration) string {
		now := time.Now()
		token := jwt.NewWithClaims(method, &jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiresDelta)),
			IssuedAt:  jwt.NewNumericDate(now),
		})
		tokenStr, _ := tokenHandler.Sign(token)
		return tokenStr
	}

	tests := []testArgs{
		{
			name:           "GompClaims, no Remember Me",
			tokenStr:       createGompToken(1, []string{"A", "B"}, false),
			wantErr:        false,
			wantScopes:     []string{"A", "B"},
			wantRememberMe: false,
		},
		{
			name:           "GompClaims, with Remember Me",
			tokenStr:       createGompToken(1, []string{"A"}, true),
			wantErr:        false,
			wantScopes:     []string{"A"},
			wantRememberMe: true,
		},
		{
			name:     "GompClaims, expired",
			tokenStr: createGompTokenWithExpiration(1, []string{"A", "B"}, false, time.Now(), time.Now().Add(-2*time.Hour)),
			wantErr:  true,
		},
		{
			name:     "GompClaims, wrong signing method",
			tokenStr: createStandardToken(jwt.SigningMethodHS384, time.Hour),
			wantErr:  true,
		},
		{
			name:     "RegisteredClaims",
			tokenStr: createStandardToken(jwt.SigningMethodHS256, time.Hour),
			wantErr:  true,
		},
		{
			name:     "Invalid token",
			tokenStr: "invalid-token",
			wantErr:  true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			parsedToken, err := tokenHandler.Parse(test.tokenStr)

			if test.wantErr != (err != nil) {
				t.Fatalf("unexpected error: %v", err)
			}
			if err == nil {
				if !lo.ElementsMatch(parsedToken.TypedClaims.Scopes, test.wantScopes) {
					t.Errorf("want scopes %v, got %v", test.wantScopes, parsedToken.TypedClaims.Scopes)
				}
				if parsedToken.TypedClaims.RememberMe != test.wantRememberMe {
					t.Errorf("want remember me %v, got %v", test.wantRememberMe, parsedToken.TypedClaims.RememberMe)
				}
			}
		})
	}
}

func Test_AsCookie(t *testing.T) {
	type testArgs struct {
		name          string
		generateToken bool
		expiresAt     time.Time
		wantExpiresAt time.Time
	}

	now := time.Now()
	tests := []testArgs{
		{
			name:          "Nominal",
			generateToken: true,
			expiresAt:     now.Add(24 * time.Hour),
			wantExpiresAt: now.Add(24 * time.Hour),
		},
		{
			name:          "Past Expiration",
			generateToken: true,
			expiresAt:     now.Add(-24 * time.Hour),
			wantExpiresAt: now.Add(-24 * time.Hour),
		},
		{
			name:          "Generate expired cookie",
			generateToken: false,
			wantExpiresAt: now.Add(-1 * time.Hour),
		},
	}

	tokenHandler := NewTokenHandler([]string{"secure-key1", "secure-key2"})
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			var (
				token    *JwtToken
				tokenStr string
			)
			if test.generateToken {
				token, _ = tokenHandler.GenerateWithExpiration(1, []string{"A"}, false, now, test.expiresAt)
				tokenStr, _ = tokenHandler.Sign(token.Token)
			} else {
				token = nil
				tokenStr = ""
			}
			cookie, err := tokenHandler.AsCookie(token)

			if err != nil {
				t.Fatalf("unexpected error creating cookie: %v", err)
			}
			if cookie.Name != cookieName {
				t.Errorf("expected cookie name %s, got %s", cookieName, cookie.Name)
			}
			if cookie.Value != tokenStr {
				t.Errorf("expected cookie value %s, got %s", tokenStr, cookie.Value)
			}
			if cookie.Path != "/" {
				t.Errorf("expected cookie path '/', got %s", cookie.Path)
			}
			if cookie.Expires.Sub(test.wantExpiresAt).Abs() > time.Second {
				t.Errorf("expected cookie expiration %v, got %v", test.expiresAt, cookie.Expires)
			}
			if !cookie.HttpOnly {
				t.Error("expected HttpOnly to be true")
			}
			if cookie.SameSite != http.SameSiteStrictMode {
				t.Errorf("expected SameSite to be %v, got %v", http.SameSiteStrictMode, cookie.SameSite)
			}
		})
	}
}

func Test_FromRequest(t *testing.T) {
	type testArgs struct {
		name          string
		includeCookie bool
		cookieName    string
		invalidToken  bool
		expectError   bool
	}

	tests := []testArgs{
		{
			name:          "Valid cookie and user exists",
			includeCookie: true,
			cookieName:    "auth_token",
			invalidToken:  false,
			expectError:   false,
		},
		{
			name:          "Invalid cookie name",
			includeCookie: true,
			cookieName:    "invalid-name",
			invalidToken:  false,
			expectError:   true,
		},
		{
			name:          "No cookie provided",
			includeCookie: false,
			cookieName:    "",
			invalidToken:  false,
			expectError:   true,
		},
		{
			name:          "Invalid token",
			includeCookie: true,
			cookieName:    "auth_token",
			invalidToken:  true,
			expectError:   true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			expectedUserID := int64(1)
			expectedAccessLevel := models.Admin

			tokenHandler := NewTokenHandler([]string{"secure-key1", "secure-key2"})

			req, _ := http.NewRequest("GET", "http://example.com", nil)
			if test.includeCookie {
				var tokenStr string
				if test.invalidToken {
					tokenStr = "invalid-token"
				} else {
					token, _ := tokenHandler.Generate(expectedUserID, GetScopes(expectedAccessLevel), false)
					tokenStr, _ = tokenHandler.Sign(token.Token)
				}
				req.AddCookie(&http.Cookie{Name: test.cookieName, Value: tokenStr})
			}

			// Act
			token, err := tokenHandler.FromRequest(req)

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("expected error: %v, received error: %v", test.expectError, err)
			} else if err == nil {
				usedID, userIDErr := token.TypedClaims.GetUserID()
				if userIDErr != nil {
					t.Errorf("error getting user ID from token: %v", userIDErr)
				}
				if usedID != expectedUserID {
					t.Errorf("expected user ID: %v, received user ID: %v", expectedUserID, usedID)
				}
				if token == nil {
					t.Error("expected token to be returned, got nil")
				}
			}
		})
	}
}
