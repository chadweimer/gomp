package infra

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

const cookieName = "auth_token"

// TokenHandler is responsible for generating, signing, and parsing JWT tokens using a set of secure keys.
type TokenHandler struct {
	secureKeys []string
}

// NewTokenHandler creates a new TokenHandler with the provided secure keys.
func NewTokenHandler(secureKeys []string) *TokenHandler {
	return &TokenHandler{
		secureKeys: secureKeys,
	}
}

// Generate creates a JWT token for the given user ID and scopes using the provided secure keys.
// If rememberMe is true, the token is valid for 14 days; otherwise, it is valid for 24 hours.
func (t *TokenHandler) Generate(userID int64, scopes []string, rememberMe bool) (*JwtToken, error) {
	issuedAt := time.Now()
	var expiresAt time.Time
	if rememberMe {
		expiresAt = issuedAt.AddDate(0, 0, 14)
	} else {
		expiresAt = issuedAt.Add(24 * time.Hour)
	}

	return t.GenerateWithExpiration(userID, scopes, rememberMe, issuedAt, expiresAt)
}

// GenerateWithExpiration creates a JWT token with explicit issuedAt and expiresAt timestamps using the provided secure keys.
func (*TokenHandler) GenerateWithExpiration(userID int64, scopes []string, rememberMe bool, issuedAt, expiresAt time.Time) (*JwtToken, error) {
	claims := &GompClaims{
		ExpiresAt:  jwt.NewNumericDate(expiresAt),
		IssuedAt:   jwt.NewNumericDate(issuedAt),
		Subject:    strconv.FormatInt(userID, 10),
		Scopes:     jwt.ClaimStrings(scopes),
		RememberMe: rememberMe,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return &JwtToken{token, claims}, nil
}

// Sign signs the given JWT token and returns the signed token string.
func (t *TokenHandler) Sign(token *jwt.Token) (string, error) {
	// Always sign using the 0'th key
	return token.SignedString([]byte(t.secureKeys[0]))
}

// Parse parses the given token string and returns the token if it's valid
func (t *TokenHandler) Parse(tokenStr string) (*JwtToken, error) {
	for _, key := range t.secureKeys {
		token, err := t.tryParse(tokenStr, key)
		if err == nil {
			return token, nil
		}
	}
	return nil, errors.New("invalid token")
}

// AsCookie generates an HTTP cookie from the given JWT token with the appropriate settings for authentication.
// As a special case, if the token passed is nil, the returned cookie will have an empty value and an expired timestamp.
func (t *TokenHandler) AsCookie(token *JwtToken) (*http.Cookie, error) {
	var (
		err       error
		tokenStr  string
		expiresAt time.Time
	)
	if token == nil {
		tokenStr = ""
		expiresAt = time.Now().Add(-1 * time.Hour)
	} else {
		tokenStr, err = t.Sign(token.Token)
		if err != nil {
			return nil, err
		}
		expiresAt = token.TypedClaims.ExpiresAt.Time
	}

	return &http.Cookie{ // #nosec G124: Not setting Secure for now to support both HTTP and HTTPS. May revisit this in the future
		Name:     cookieName,
		Value:    tokenStr,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	}, nil
}

// FromRequest checks if the user is authenticated and returns the user, JWT token, and any error encountered.
func (t *TokenHandler) FromRequest(r *http.Request) (*JwtToken, error) {
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		if errors.Is(err, http.ErrNoCookie) {
			return nil, errors.New("authorization cookie missing")
		}
		return nil, errors.New("error retrieving auth cookie")
	}
	tokenStr := cookie.Value

	token, err := t.Parse(tokenStr)
	if err != nil {
		return nil, err
	}

	if len(token.TypedClaims.Scopes) == 0 {
		return nil, ErrMissingScopes
	}

	return token, nil
}

func (*TokenHandler) tryParse(tokenStr, key string) (*JwtToken, error) {
	claims := new(GompClaims)
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("incorrect signing method")
		}

		return []byte(key), nil
	})
	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return &JwtToken{token, claims}, nil
}
