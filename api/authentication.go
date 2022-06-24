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
	"github.com/chadweimer/gomp/generated/api/public"
	"github.com/chadweimer/gomp/generated/models"
	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v4"
	"github.com/rs/zerolog/log"
)

func (h apiHandler) Authenticate(w http.ResponseWriter, r *http.Request) {
	var credentials public.Credentials
	if err := readJSONFromRequest(r, &credentials); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	user, err := h.db.Users().Authenticate(credentials.Username, credentials.Password)
	if err != nil {
		h.Error(w, r, http.StatusUnauthorized, err)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 14 * 24)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Subject:   strconv.FormatInt(*user.Id, 10),
	})
	// Always sign using the 0'th key
	tokenStr, err := token.SignedString([]byte(h.cfg.SecureKeys[0]))
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
	}

	h.OK(w, public.AuthenticationResponse{Token: tokenStr, User: *user})
}

func (h apiHandler) requireAuthentication(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, err := h.getAuthTokenFromRequest(r)
		if err != nil {
			h.Error(w, r, http.StatusUnauthorized, err)
			return
		}
		userId, err := h.getUserIdFromToken(token)
		if err != nil {
			h.Error(w, r, http.StatusUnauthorized, err)
			return
		}

		user, err := h.verifyUserExists(userId)
		if err != nil {
			if errors.Is(err, db.ErrNotFound) {
				h.Error(w, r, http.StatusUnauthorized, errors.New("invalid user"))
			} else {
				h.Error(w, r, http.StatusInternalServerError, err)
			}
			return
		}

		// Add the user's ID and access level to the list of params
		ctx := r.Context()
		ctx = context.WithValue(ctx, currentUserIdCtxKey, user.Id)
		ctx = context.WithValue(ctx, currentUserAccessLevelCtxKey, user.AccessLevel)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h apiHandler) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := h.verifyUserIsAdmin(r); err != nil {
			h.Error(w, r, http.StatusForbidden, err)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (h apiHandler) requireAdminUnlessSelf(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		urlId, err := getUserIdFromUrl(r)
		if err != nil {
			h.Error(w, r, http.StatusBadRequest, err)
			return
		}
		ctxId, err := getResourceIdFromCtx(r, currentUserIdCtxKey)
		if err != nil {
			h.Error(w, r, http.StatusUnauthorized, err)
			return
		}

		// Admin privleges are required if the session user doesn't match the request user
		if urlId != ctxId {
			if err := h.verifyUserIsAdmin(r); err != nil {
				h.Error(w, r, http.StatusForbidden, err)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (h apiHandler) requireEditor(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := h.verifyUserIsEditor(r); err != nil {
			h.Error(w, r, http.StatusForbidden, err)
			return
		}

		next.ServeHTTP(w, r)
	})
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
		token, err := jwt.ParseWithClaims(tokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
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

func (h apiHandler) getUserIdFromToken(token *jwt.Token) (int64, error) {
	claims := token.Claims.(*jwt.RegisteredClaims)
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

func (h apiHandler) verifyUserIsAdmin(r *http.Request) error {
	accessLevel := r.Context().Value(currentUserAccessLevelCtxKey).(models.AccessLevel)
	if accessLevel != models.Admin {
		return fmt.Errorf("endpoint '%s' requires admin rights", r.URL.Path)
	}

	return nil
}

func (h apiHandler) verifyUserIsEditor(r *http.Request) error {
	accessLevel := r.Context().Value(currentUserAccessLevelCtxKey).(models.AccessLevel)
	if accessLevel != models.Admin && accessLevel != models.Editor {
		return fmt.Errorf("endpoint '%s' requires edit rights", r.URL.Path)
	}

	return nil
}

func getUserIdFromUrl(r *http.Request) (int64, error) {
	idStr := chi.URLParam(r, "userId")

	// Assume current user if not in the route
	if idStr == "" {
		return getResourceIdFromCtx(r, currentUserIdCtxKey)
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse user id from URL, value = %s: %v", idStr, err)
	}

	return id, nil
}
