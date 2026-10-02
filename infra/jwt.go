package infra

import (
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samber/lo"
)

// ---- Begin Standard Errors ----

// ErrMissingScopes is returned when a token does not have any scopes.
var ErrMissingScopes = errors.New("token had no scopes")

// ---- End Standard Errors ----

// GompClaims is the struct that represents the claims in the JWT token used for authentication and authorization in Gomp.
// It includes the standard registered claims as well as a custom "Scopes" claim that lists the scopes associated with the token.
type GompClaims struct {
	jwt.RegisteredClaims

	Scopes     jwt.ClaimStrings `json:"scopes"`
	RememberMe bool             `json:"remember_me,omitempty"`
}

// CreateToken creates a JWT token for the given user ID and scopes using the provided secure keys.
// If rememberMe is true, the token is valid for 14 days; otherwise, it is valid for 24 hours.
func CreateToken(userID int64, scopes []string, rememberMe bool) (*jwt.Token, *time.Time, error) {
	issuedAt := time.Now()
	var expiresAt time.Time
	if rememberMe {
		expiresAt = issuedAt.AddDate(0, 0, 14)
	} else {
		expiresAt = issuedAt.Add(24 * time.Hour)
	}

	return CreateTokenWithExpiration(userID, scopes, rememberMe, issuedAt, expiresAt)
}

// CreateTokenWithExpiration creates a JWT token with explicit issuedAt and expiresAt timestamps using the provided secure keys.
func CreateTokenWithExpiration(userID int64, scopes []string, rememberMe bool, issuedAt, expiresAt time.Time) (*jwt.Token, *time.Time, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, &GompClaims{
		ExpiresAt:  jwt.NewNumericDate(expiresAt),
		IssuedAt:   jwt.NewNumericDate(issuedAt),
		Subject:    strconv.FormatInt(userID, 10),
		Scopes:     jwt.ClaimStrings(scopes),
		RememberMe: rememberMe,
	})

	return token, &expiresAt, nil
}

// SignToken signs the given JWT token using the first key in the provided secure keys slice.
func SignToken(token *jwt.Token, secureKeys []string) (string, error) {
	// Always sign using the 0'th key
	return token.SignedString([]byte(secureKeys[0]))
}

// ShouldRefreshToken checks if the token should be refreshed and whether its expiration should be extended.
// It returns shouldRefresh=true, extendExpiration=true if the token has RememberMe enabled and is near expiration (remaining <= half of total validity).
// It returns shouldRefresh=true, extendExpiration=false if the user's scopes have changed but it is not near expiration.
// If both conditions apply, extendExpiration is true.
func ShouldRefreshToken(claims *GompClaims, user *models.User) (shouldRefresh bool, extendExpiration bool) {
	if claims == nil || user == nil {
		return false, false
	}

	if claims.RememberMe && claims.ExpiresAt != nil {
		totalDuration := 14 * 24 * time.Hour
		if claims.IssuedAt != nil {
			totalDuration = claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time)
		}
		remainingDuration := time.Until(claims.ExpiresAt.Time)
		if remainingDuration <= totalDuration/2 {
			shouldRefresh = true
			extendExpiration = true
		}
	}

	userScopes := GetScopes(user.AccessLevel)
	if !lo.ElementsMatch(userScopes, []string(claims.Scopes)) {
		shouldRefresh = true
	}

	return shouldRefresh, extendExpiration
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

// CheckScopes verifies that the user has the required scopes.
func CheckScopes(requiredScopes []string, claims *GompClaims) error {
	// If the route requires scopes, check them
	if len(requiredScopes) > 0 && (len(requiredScopes) != 1 || requiredScopes[0] != "") {
		missingScopes, _ := lo.Difference(requiredScopes, claims.Scopes)
		if len(missingScopes) > 0 {
			return fmt.Errorf("missing scopes: %v", missingScopes)
		}
	}

	return nil
}
