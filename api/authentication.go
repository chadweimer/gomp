package api

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/julienschmidt/httprouter"
)

type authenticateRequest struct {
	UserName string `json:"username"`
	Password string `json:"password"`
}

type authenticateResponse struct {
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
		var lastErr error
		for _, key := range h.cfg.SecureKeys {
			token, err := jwt.ParseWithClaims(tokenStr, &jwt.StandardClaims{}, func(token *jwt.Token) (interface{}, error) {
				if token.Method != jwt.SigningMethodHS256 {
					return nil, errors.New("Incorrect signing method")
				}

				return []byte(key), nil
			})

			if err == nil && token.Valid {
				claims := token.Claims.(*jwt.StandardClaims)
				p = append(p, httprouter.Param{Key: "AuthUserID", Value: claims.Subject})
				handler(resp, req, p)
				return
			}
			lastErr = err
		}

		h.JSON(resp, http.StatusUnauthorized, lastErr.Error())
	}
}
