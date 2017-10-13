package api

import (
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getUserSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userIDStr := p.ByName("userID")

	// Special case for a URL like /api/v1/users/current/settings
	if userIDStr == "current" {
		userIDStr = p.ByName("CurrentUserID")
	}

	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	userSettings, err := h.model.Users.ReadSettings(userID)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, userSettings)
}
