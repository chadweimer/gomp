package api

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/chadweimer/gomp/models"
	jwt "github.com/dgrijalva/jwt-go"
	"github.com/julienschmidt/httprouter"
)

// swagger:model
type authenticateRequest struct {
	// username
	//
	// recuired: true
	UserName string `json:"username"`
	// password
	//
	// recuired: true
	Password string `json:"password"`
}

// swagger:model
type authenticateResponse struct {
	// the JSON Web Token
	Token string `json:"token"`
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

	h.JSON(resp, http.StatusOK, authenticateResponse{Token: tokenStr})
}

func (h apiHandler) requireAuthentication(handler httprouter.Handle) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		authHeader := req.Header.Get("Authorization")
		if authHeader == "" {
			h.JSON(resp, http.StatusUnauthorized, "Authorization header missing")
			return
		}

		authHeaderParts := strings.Split(authHeader, " ")
		if len(authHeaderParts) != 2 || strings.ToLower(authHeaderParts[0]) != "bearer" {
			h.JSON(resp, http.StatusUnauthorized, "Authorization header must be in the form 'Bearer {token}'")
			return
		}

		tokenStr := authHeaderParts[1]

		// Try each key when validating the token
		var err error
		var userID int64
		for _, key := range h.cfg.SecureKeys {
			userID, err = h.getUserIDFromToken(tokenStr, key)
			if err == nil {
				// We got the user from the token, so proceed
				break
			}
		}

		if err != nil {
			h.JSON(resp, http.StatusUnauthorized, err.Error())
			return
		}

		err = h.verifyUserExists(userID)
		if err == models.ErrNotFound {
			h.JSON(resp, http.StatusUnauthorized, errors.New("Invalid user"))
		} else if err != nil {
			h.JSON(resp, http.StatusInternalServerError, err.Error())
		} else {
			// Add the user's ID to the list of params
			p = append(p, httprouter.Param{Key: "CurrentUserID", Value: strconv.FormatInt(userID, 10)})

			handler(resp, req, p)
		}
	}
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

func (h apiHandler) verifyUserExists(userID int64) error {
	// Verify this is a valid user in the DB
	_, err := h.model.Users.Read(userID)
	if err != nil {
		if err == models.ErrNotFound {
			return err
		}

		log.Printf("Error retrieving user info: '%+v'", err)
		return errors.New("Error retrieving user info")
	}

	return nil
}
