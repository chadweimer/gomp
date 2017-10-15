package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
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

func (h apiHandler) putUserSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
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

	userSettings := new(models.UserSettings)
	if err := readJSONFromRequest(req, userSettings); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	// Make sure the ID is set in the object
	if userSettings.UserID == 0 {
		userSettings.UserID = userID
	} else if userSettings.UserID != userID {
		h.JSON(resp, http.StatusBadRequest, errors.New("mismatched user id between request and url"))
	}

	if err := h.model.Users.UpdateSettings(userSettings); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}
