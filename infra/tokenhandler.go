package infra

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

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
