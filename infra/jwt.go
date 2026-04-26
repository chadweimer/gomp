package infra

import (
	"errors"
	"log/slog"
	"strconv"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
)

// GompClaims is the struct that represents the claims in the JWT token used for authentication and authorization in Gomp.
// It includes the standard registered claims as well as a custom "Scopes" claim that lists the scopes associated with the token.
type GompClaims struct {
	jwt.RegisteredClaims

	Scopes jwt.ClaimStrings `json:"scopes"`
}

// CreateToken creates a JWT token for the given user ID and scopes using the provided secure keys
func CreateToken(userID int64, scopes []string, secureKeys []string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, GompClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().AddDate(0, 0, 14)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   strconv.FormatInt(userID, 10),
		},
		Scopes: jwt.ClaimStrings(scopes),
	})

	// Always sign using the 0'th key
	tokenStr, err := token.SignedString([]byte(secureKeys[0]))
	if err != nil {
		return "", err
	}
	return tokenStr, nil
}

// ParseToken parses the given token string using the provided key and returns the token if it's valid
func ParseToken(tokenStr, key string) (*jwt.Token, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &GompClaims{}, func(token *jwt.Token) (any, error) {
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

	return token, nil
}

// GetUserIDFromClaims extracts the user ID from the given JWT claims.
// It returns an error if the claims are invalid or if the user ID cannot be parsed.
func GetUserIDFromClaims(claims jwt.RegisteredClaims, logger *slog.Logger) (int64, error) {
	userID, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		logger.Error("Invalid claims", "error", err)
		return -1, errors.New("invalid claims")
	}

	return userID, nil
}

// GetScopes returns a list of scopes that should be included in a token for a given access level.
func GetScopes(accessLevel models.AccessLevel) []string {
	scopes := make([]string, 0)

	scopes = append(scopes, string(models.Viewer))
	switch accessLevel {
	case models.Admin:
		scopes = append(scopes, string(models.Admin))
		scopes = append(scopes, string(models.Editor))
	case models.Editor:
		scopes = append(scopes, string(models.Editor))
	default:
		// Viewer level or any other access level only gets Viewer scope
	}

	return scopes
}
