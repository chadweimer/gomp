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

func (r Router) postAuthenticate(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var authRequest authenticateRequest
	if err := readJSONFromRequest(req, &authRequest); err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	user, err := r.model.Users.Authenticate(authRequest.UserName, authRequest.Password)
	if err != nil {
		writeUnauthorizedErrorToResponse(resp, err)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.StandardClaims{
		ExpiresAt: time.Now().Add(time.Hour * 14 * 24).Unix(),
		IssuedAt:  time.Now().Unix(),
		Subject:   strconv.FormatInt(user.ID, 10),
	})
	tokenStr, err := token.SignedString([]byte(r.cfg.SecretKey))
	if err != nil {
		writeServerErrorToResponse(resp, err)
	}

	writeJSONToResponse(resp, authenticateResponse{Token: tokenStr})
}

func (r Router) requireAuthentication(handler httprouter.Handle) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		authHeader := req.Header.Get("Authorization")
		if authHeader == "" {
			writeUnauthorizedErrorToResponse(resp, errors.New("Authorization header missing"))
			return
		}

		authHeaderParts := strings.Split(authHeader, " ")
		if len(authHeaderParts) != 2 || strings.ToLower(authHeaderParts[0]) != "bearer" {
			writeUnauthorizedErrorToResponse(resp, errors.New("Authorization header must be in the form 'Bearer {token}'"))
			return
		}

		tokenStr := authHeaderParts[1]
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("Incorrect signing method")
			}

			return []byte(r.cfg.SecretKey), nil
		})
		if err != nil || !token.Valid {
			writeUnauthorizedErrorToResponse(resp, err)
			return
		}

		handler(resp, req, p)
	}
}
