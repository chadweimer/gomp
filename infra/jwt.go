package infra

import (
	"errors"
	"fmt"
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

// JwtToken is a strongly typed representation of the jwt.Token with GompClaims
type JwtToken struct {
	*jwt.Token
	TypedClaims *GompClaims
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

// GetUserIDFromClaims extracts the user ID from the given JWT claims.
// It returns an error if the claims are invalid or if the user ID cannot be parsed.
func GetUserIDFromClaims(claims jwt.RegisteredClaims) (int64, error) {
	userID, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
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
