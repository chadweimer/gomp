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
	if err := h.readJSONFromRequest(req, &authRequest); err != nil {
		h.writeClientErrorToResponse(resp, err)
		return
	}

	user, err := h.model.Users.Authenticate(authRequest.UserName, authRequest.Password)
	if err != nil {
		h.writeUnauthorizedErrorToResponse(resp, err)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.StandardClaims{
		ExpiresAt: time.Now().Add(time.Hour * 14 * 24).Unix(),
		IssuedAt:  time.Now().Unix(),
		Subject:   strconv.FormatInt(user.ID, 10),
	})
	tokenStr, err := token.SignedString([]byte(h.cfg.SecretKey))
	if err != nil {
		panic(err)
	}

	h.writeJSONToResponse(resp, authenticateResponse{Token: tokenStr})
}

func (h apiHandler) requireAuthentication(handler httprouter.Handle) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		authHeader := req.Header.Get("Authorization")
		if authHeader == "" {
			h.writeUnauthorizedErrorToResponse(resp, errors.New("Authorization header missing"))
			return
		}

		authHeaderParts := strings.Split(authHeader, " ")
		if len(authHeaderParts) != 2 || strings.ToLower(authHeaderParts[0]) != "bearer" {
			h.writeUnauthorizedErrorToResponse(resp, errors.New("Authorization header must be in the form 'Bearer {token}'"))
			return
		}

		tokenStr := authHeaderParts[1]
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("Incorrect signing method")
			}

			return []byte(h.cfg.SecretKey), nil
		})
		if err != nil || !token.Valid {
			h.writeUnauthorizedErrorToResponse(resp, err)
			return
		}

		handler(resp, req, p)
	}
}
