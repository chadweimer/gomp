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
	"github.com/chadweimer/gomp/models"
	jwt "github.com/dgrijalva/jwt-go"
	"github.com/go-chi/chi"
)

type authenticateRequest struct {
	UserName string `json:"username"`
	Password string `json:"password"`
}

type authenticateResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

func (h *apiHandler) postAuthenticate(resp http.ResponseWriter, req *http.Request) {
	var authRequest authenticateRequest
	if err := readJSONFromRequest(req, &authRequest); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	user, err := h.db.Users().Authenticate(authRequest.UserName, authRequest.Password)
	if err != nil {
		h.Error(resp, http.StatusUnauthorized, err)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.StandardClaims{
		ExpiresAt: time.Now().Add(time.Hour * 14 * 24).Unix(),
		IssuedAt:  time.Now().Unix(),
		Subject:   strconv.FormatInt(user.ID, 10),
	})
	// Always sign using the 0'th key
	tokenStr, err := token.SignedString([]byte(h.cfg.SecureKeys[0]))
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
	}

	h.OK(resp, authenticateResponse{Token: tokenStr, User: user})
}

func (h *apiHandler) requireAuthentication(next http.Handler) http.Handler {
	return http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		userID, err := h.getUserIDFromRequest(req)
		if err != nil {
			h.Error(resp, http.StatusUnauthorized, err)
			return
		}

		user, err := h.verifyUserExists(userID)
		if err != nil {
			if err == db.ErrNotFound {
				h.Error(resp, http.StatusUnauthorized, errors.New("Invalid user"))
			} else {
				h.Error(resp, http.StatusInternalServerError, err)
			}
			return
		}

		// Add the user's ID and access level to the list of params
		ctx := req.Context()
		ctx = context.WithValue(ctx, currentUserIDKey, strconv.FormatInt(user.ID, 10))
		ctx = context.WithValue(ctx, currentUserAccessLevelKey, string(user.AccessLevel))

		req = req.WithContext(ctx)
		next.ServeHTTP(resp, req)
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
		// Get the user from the request
		userIDStr := chi.URLParam(req, userIDKey)
		// Get the user from the current session
		currentUserIDStr := req.Context().Value(currentUserIDKey).(string)

		// Special case for a URL like /api/v1/users/current
		if userIDStr == "current" {
			userIDStr = currentUserIDStr
		}

		// Admin privleges are required if the session user doesn't match the request user
		if userIDStr != currentUserIDStr {
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
		// Get the user from the request
		userIDStr := chi.URLParam(req, userIDKey)
		// Get the user from the current session
		currentUserIDStr := req.Context().Value(currentUserIDKey).(string)

		// Special case for a URL like /api/v1/users/current
		if userIDStr == "current" {
			userIDStr = currentUserIDStr
		}

		// Don't allow operating on the current user (e.g., for deleting)
		if userIDStr == currentUserIDStr {
			err := fmt.Errorf("Endpoint '%s' disallowed on current user", req.URL.Path)
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

func (h *apiHandler) getUserIDFromRequest(req *http.Request) (int64, error) {
	authHeader := req.Header.Get("Authorization")
	if authHeader == "" {
		return -1, errors.New("Authorization header missing")
	}

	authHeaderParts := strings.Split(authHeader, " ")
	if len(authHeaderParts) != 2 || strings.ToLower(authHeaderParts[0]) != "bearer" {
		return -1, errors.New("Authorization header must be in the form 'Bearer {token}'")
	}

	tokenStr := authHeaderParts[1]

	// Try each key when validating the token
	var err error
	var userID int64
	for _, key := range h.cfg.SecureKeys {
		userID, err = h.getUserIDFromToken(tokenStr, key)
		if err == nil {
			// We got the user from the token, so proceed
			return userID, nil
		}
	}

	return -1, err
}

func (h *apiHandler) getUserIDFromToken(tokenStr string, key string) (int64, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &jwt.StandardClaims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("Incorrect signing method")
		}

		return []byte(key), nil
	})
	if err != nil || !token.Valid {
		log.Printf("Invalid JWT token: '%+v'", err)
		return -1, errors.New("Invalid token")
	}

	claims := token.Claims.(*jwt.StandardClaims)
	userID, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		log.Printf("Invalid claims: '%+v'", err)
		return -1, errors.New("Invalid claims")
	}

	return userID, nil
}

func (h *apiHandler) verifyUserExists(userID int64) (*models.User, error) {
	// Verify this is a valid user in the DB
	user, err := h.db.Users().Read(userID)
	if err != nil {
		if err == db.ErrNotFound {
			return nil, err
		}

		log.Printf("Error retrieving user info: '%+v'", err)
		return nil, errors.New("Error retrieving user info")
	}

	return user, nil
}

func (h *apiHandler) verifyUserIsAdmin(req *http.Request) error {
	accessLevelStr := req.Context().Value(currentUserAccessLevelKey)
	if accessLevelStr != string(models.AdminUserLevel) {
		return fmt.Errorf("Endpoint '%s' requires admin rights", req.URL.Path)
	}

	return nil
}

func (h *apiHandler) verifyUserIsEditor(req *http.Request) error {
	accessLevelStr := req.Context().Value(currentUserAccessLevelKey)
	if accessLevelStr != string(models.AdminUserLevel) && accessLevelStr != string(models.EditorUserLevel) {
		return fmt.Errorf("Endpoint '%s' requires edit rights", req.URL.Path)
	}

	return nil
}
