package api

import (
	"net/http"

	"strings"

	"strconv"

	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getUserRole(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userIDParam := p.ByName("userID")

	var userID int64
	var err error
	if strings.ToLower(userIDParam) == "self" {
		userID, err = strconv.ParseInt(p.ByName("AuthUserID"), 10, 64)
	} else {
		userID, err = strconv.ParseInt(userIDParam, 10, 64)
	}
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}
	_ = userID
}
