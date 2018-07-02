package api

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/chadweimer/gomp/models"
	jwt "github.com/dgrijalva/jwt-go"
	"github.com/julienschmidt/httprouter"
)

type authenticateRequest struct {
	UserName string `json:"username"`
	Password string `json:"password"`
}

type authenticateResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

func (h apiHandler) postAuthenticate(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var authRequest authenticateRequest
	if err := readJSONFromRequest(req, &authRequest); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	user, err := h.model.Users.Authenticate(authRequest.UserName, authRequest.Password)
	if err != nil {
		h.JSON(resp, http.StatusUnauthorized, err.Error())
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
		h.JSON(resp, http.StatusInternalServerError, err.Error())
	}

	h.JSON(resp, http.StatusOK, authenticateResponse{Token: tokenStr, User: user})
}

func (h apiHandler) requireAuthentication(handler httprouter.Handle) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		userID, err := h.getUserIDFromRequest(req)
		if err != nil {
			h.JSON(resp, http.StatusUnauthorized, err.Error())
			return
		}

		user, err := h.verifyUserExists(userID)
		if err != nil {
			if err == models.ErrNotFound {
				h.JSON(resp, http.StatusUnauthorized, errors.New("Invalid user"))
			} else {
				h.JSON(resp, http.StatusInternalServerError, err.Error())
			}
			return
		}

		// Add the user's ID and access level to the list of params
		p = append(p, httprouter.Param{Key: "CurrentUserID", Value: strconv.FormatInt(user.ID, 10)})
		p = append(p, httprouter.Param{Key: "CurrentUserAccessLevel", Value: string(user.AccessLevel)})

		handler(resp, req, p)
	}
}

func (h apiHandler) requireAdmin(handler httprouter.Handle) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		if err := h.verifyUserIsAdmin(req, p); err != nil {
			h.JSON(resp, http.StatusForbidden, err.Error())
			return
		}

		handler(resp, req, p)
	}
}

func (h apiHandler) requireAdminUnlessSelf(handler httprouter.Handle) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		// Get the user from the request
		userIDStr := p.ByName("userID")
		// Get the user from the current session
		currentUserIDStr := p.ByName("CurrentUserID")

		// Special case for a URL like /api/v1/users/current
		if userIDStr == "current" {
			userIDStr = currentUserIDStr
		}

		// Admin privleges are required if the session user doesn't match the request user
		if userIDStr != currentUserIDStr {
			if err := h.verifyUserIsAdmin(req, p); err != nil {
				h.JSON(resp, http.StatusForbidden, err.Error())
				return
			}
		}

		handler(resp, req, p)
	}
}

func (h apiHandler) getUserIDFromRequest(req *http.Request) (int64, error) {
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

func (h apiHandler) getUserIDFromToken(tokenStr string, key string) (int64, error) {
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

func (h apiHandler) verifyUserExists(userID int64) (*models.User, error) {
	// Verify this is a valid user in the DB
	user, err := h.model.Users.Read(userID)
	if err != nil {
		if err == models.ErrNotFound {
			return nil, err
		}

		log.Printf("Error retrieving user info: '%+v'", err)
		return nil, errors.New("Error retrieving user info")
	}

	return user, nil
}

func (h apiHandler) verifyUserIsAdmin(req *http.Request, p httprouter.Params) error {
	accessLevelStr := p.ByName("CurrentUserAccessLevel")
	if accessLevelStr != string(models.AdminUserLevel) {
		return fmt.Errorf("Endpoint '%s' requires admin rights", req.URL.Path)
	}

	return nil
}
