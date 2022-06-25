package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/models"
	"github.com/chadweimer/gomp/generated/oapi"
	"github.com/golang-jwt/jwt/v4"
	"github.com/rs/zerolog/log"
)

type gompClaims struct {
	jwt.RegisteredClaims

	Scopes jwt.ClaimStrings `json:"scopes"`
}

func (h apiHandler) Authenticate(w http.ResponseWriter, r *http.Request) {
	var credentials oapi.Credentials
	if err := readJSONFromRequest(r, &credentials); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	user, err := h.db.Users().Authenticate(credentials.Username, credentials.Password)
	if err != nil {
		h.Error(w, r, http.StatusUnauthorized, err)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, gompClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 14 * 24)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   strconv.FormatInt(*user.Id, 10),
		},
		Scopes: jwt.ClaimStrings(getScopes(user)),
	})
	// Always sign using the 0'th key
	tokenStr, err := token.SignedString([]byte(h.cfg.SecureKeys[0]))
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
	}

	h.OK(w, r, oapi.AuthenticationResponse{Token: tokenStr, User: *user})
}

func (h apiHandler) checkScopes(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		scopes, ok := r.Context().Value(oapi.BearerScopes).([]string)
		if ok {
			if err := h.isAuthenticated(r); err != nil {
				h.Error(w, r, http.StatusUnauthorized, err)
				return
			}

			for _, scope := range scopes {
				if err := h.verifyUserHasScope(r, scope); err != nil {
					err := fmt.Errorf("endpoint '%s' requires '%s' scope: %w", r.URL.Path, scope, err)
					h.Error(w, r, http.StatusForbidden, err)
					return
				}
			}
		}

		next.ServeHTTP(w, r)
	}
}

func (h apiHandler) isAuthenticated(r *http.Request) error {
	token, err := h.getAuthTokenFromRequest(r)
	if err != nil {
		return err
	}

	claims := token.Claims.(*gompClaims)
	if len(claims.Scopes) == 0 {
		return errors.New("token had no scopes")
	}

	userId, err := h.getUserIdFromToken(token)
	if err != nil {
		return err
	}

	user, err := h.verifyUserExists(userId)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return errors.New("invalid user")
		}

		return err
	}

	// Add the user's ID and token to the list of params
	ctx := r.Context()
	ctx = context.WithValue(ctx, currentUserIdCtxKey, user.Id)
	ctx = context.WithValue(ctx, currentUserTokenCtxKey, token)
	*r = *r.WithContext(ctx)

	return nil
}

func (apiHandler) verifyUserHasScope(r *http.Request, scope string) error {
	token, ok := r.Context().Value(currentUserTokenCtxKey).(*jwt.Token)
	if !ok {
		return errors.New("invalid token")
	}

	return hasScope(scope, token)
}

func getScopes(user *models.User) []string {
	var scopes []string

	scopes = append(scopes, string(models.Viewer))
	switch user.AccessLevel {
	case models.Admin:
		scopes = append(scopes, string(models.Admin))
		scopes = append(scopes, string(models.Editor))
	case models.Editor:
		scopes = append(scopes, string(models.Editor))
	}

	return scopes
}

func hasScope(required string, token *jwt.Token) error {
	claims := token.Claims.(*gompClaims)
	for _, scope := range claims.Scopes {
		if required == scope {
			return nil
		}
	}
	return errors.New("missing scope")
}

func (h apiHandler) getAuthTokenFromRequest(r *http.Request) (*jwt.Token, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("authorization header missing")
	}

	authHeaderParts := strings.Split(authHeader, " ")
	if len(authHeaderParts) != 2 || strings.ToLower(authHeaderParts[0]) != "bearer" {
		return nil, errors.New("authorization header must be in the form 'Bearer {token}'")
	}

	tokenStr := authHeaderParts[1]

	// Try each key when validating the token
	for i, key := range h.cfg.SecureKeys {
		token, err := jwt.ParseWithClaims(tokenStr, &gompClaims{}, func(token *jwt.Token) (interface{}, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("incorrect signing method")
			}

			return []byte(key), nil
		})
		if err != nil {
			log.Err(err).Int("key-index", i).Msg("Failed parsing JWT token")
			if i < (len(h.cfg.SecureKeys) + 1) {
				log.Debug().Msg("Will try again with next key")
			}
		} else if token.Valid {
			return token, nil
		}
	}

	return nil, errors.New("invalid token")
}

func (apiHandler) getUserIdFromToken(token *jwt.Token) (int64, error) {
	claims := token.Claims.(*gompClaims)
	userId, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		log.Err(err).Msg("Invalid claims")
		return -1, errors.New("invalid claims")
	}

	return userId, nil
}

func (h apiHandler) verifyUserExists(userId int64) (*models.User, error) {
	// Verify this is a valid user in the DB
	user, err := h.db.Users().Read(userId)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return nil, err
		}

		log.Err(err).Msg("Error retrieving user info")
		return nil, errors.New("error retrieving user info")
	}

	return &user.User, nil
}
