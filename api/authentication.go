package api

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/models"
	"github.com/golang-jwt/jwt/v4"
)

func (h *apiHandler) postAuthenticate(resp http.ResponseWriter, req *http.Request) {
	var credentials models.Credentials
	if err := readJSONFromRequest(req, &credentials); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	user, err := h.db.Users().Authenticate(credentials.Username, credentials.Password)
	if err != nil {
		h.Error(resp, http.StatusUnauthorized, err)
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
		h.Error(resp, http.StatusInternalServerError, err)
	}

	h.OK(resp, models.AuthenticationResponse{Token: tokenStr, User: *user})
}

func (h *apiHandler) requireAuthentication(next http.Handler) http.Handler {
	return http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		token, err := h.getAuthTokenFromRequest(req)
		if err != nil {
			h.Error(resp, http.StatusUnauthorized, err)
			return
		}
		userId, err := h.getUserIdFromToken(token)
		if err != nil {
			h.Error(resp, http.StatusUnauthorized, err)
			return
		}

		user, err := h.verifyUserExists(userId)
		if err != nil {
			if err == db.ErrNotFound {
				h.Error(resp, http.StatusUnauthorized, errors.New("invalid user"))
			} else {
				h.Error(resp, http.StatusInternalServerError, err)
			}
			return
		}

		// Add the user's ID and access level to the list of params
		ctx := req.Context()
		ctx = context.WithValue(ctx, currentUserIdCtxKey, user.Id)
		ctx = context.WithValue(ctx, currentUserAccessLevelCtxKey, user.AccessLevel)

		next.ServeHTTP(resp, req.WithContext(ctx))
	})
}

func (h *apiHandler) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		if err := h.verifyUserIsAdmin(req); err != nil {
			h.Error(resp, http.StatusForbidden, err)
			return
		}

		next.ServeHTTP(resp, req)
	})
}

func (h *apiHandler) requireAdminUnlessSelf(next http.Handler) http.Handler {
	return http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		urlId, err := getResourceIdFromUrl(req, userIdKey)
		if err != nil {
			h.Error(resp, http.StatusBadRequest, err)
			return
		}
		ctxId, err := getResourceIdFromCtx(req, currentUserIdCtxKey)
		if err != nil {
			h.Error(resp, http.StatusUnauthorized, err)
			return
		}

		// Admin privleges are required if the session user doesn't match the request user
		if urlId != ctxId {
			if err := h.verifyUserIsAdmin(req); err != nil {
				h.Error(resp, http.StatusForbidden, err)
				return
			}
		}

		next.ServeHTTP(resp, req)
	})
}

func (h *apiHandler) disallowSelf(next http.Handler) http.Handler {
	return http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		urlId, err := getResourceIdFromUrl(req, userIdKey)
		if err != nil {
			h.Error(resp, http.StatusBadRequest, err)
			return
		}
		ctxId, err := getResourceIdFromCtx(req, currentUserIdCtxKey)
		if err != nil {
			h.Error(resp, http.StatusUnauthorized, err)
			return
		}

		// Don't allow operating on the current user (e.g., for deleting)
		if urlId == ctxId {
			err := fmt.Errorf("endpoint '%s' disallowed on current user", req.URL.Path)
			h.Error(resp, http.StatusForbidden, err)
			return
		}

		next.ServeHTTP(resp, req)
	})
}

func (h *apiHandler) requireEditor(next http.Handler) http.Handler {
	return http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		if err := h.verifyUserIsEditor(req); err != nil {
			h.Error(resp, http.StatusForbidden, err)
			return
		}

		next.ServeHTTP(resp, req)
	})
}

func (h *apiHandler) getAuthTokenFromRequest(req *http.Request) (*jwt.Token, error) {
	authHeader := req.Header.Get("Authorization")
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
			log.Printf("Failed parsing JWT token with key at index %d: '%+v'", i, err)
			if i < (len(h.cfg.SecureKeys) + 1) {
				log.Print("Will try again with next key")
			}
		} else if token.Valid {
			return token, nil
		}
	}

	return nil, errors.New("invalid token")
}

func (h *apiHandler) getUserIdFromToken(token *jwt.Token) (int64, error) {
	claims := token.Claims.(*jwt.RegisteredClaims)
	userId, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		log.Printf("Invalid claims: '%+v'", err)
		return -1, errors.New("invalid claims")
	}

	return userId, nil
}

func (h *apiHandler) verifyUserExists(userId int64) (*models.User, error) {
	// Verify this is a valid user in the DB
	user, err := h.db.Users().Read(userId)
	if err != nil {
		if err == db.ErrNotFound {
			return nil, err
		}

		log.Printf("Error retrieving user info: '%+v'", err)
		return nil, errors.New("error retrieving user info")
	}

	return &user.User, nil
}

func (h *apiHandler) verifyUserIsAdmin(req *http.Request) error {
	accessLevel := req.Context().Value(currentUserAccessLevelCtxKey).(models.AccessLevel)
	if accessLevel != models.AccessLevelAdmin {
		return fmt.Errorf("endpoint '%s' requires admin rights", req.URL.Path)
	}

	return nil
}

func (h *apiHandler) verifyUserIsEditor(req *http.Request) error {
	accessLevel := req.Context().Value(currentUserAccessLevelCtxKey).(models.AccessLevel)
	if accessLevel != models.AccessLevelAdmin && accessLevel != models.AccessLevelEditor {
		return fmt.Errorf("endpoint '%s' requires edit rights", req.URL.Path)
	}

	return nil
}
