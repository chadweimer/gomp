package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

type userPutPasswordParameters struct {
	ID              int64  `json:"id"`
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (h apiHandler) getUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, fmt.Errorf("getting user from request: %v", err))
		return
	}

	user, err := h.model.Users.Read(userID)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, fmt.Errorf("reading user: %v", err))
		return
	}

	h.JSON(resp, http.StatusOK, user)
}

func (h apiHandler) putUserPassword(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, fmt.Errorf("getting user from request: %v", err))
		return
	}

	params := new(userPutPasswordParameters)
	if err := readJSONFromRequest(req, params); err != nil {
		h.JSON(resp, http.StatusBadRequest, fmt.Errorf("invalid request: %v", err))
		return
	}

	// Make sure the ID is set in the object
	if params.ID == 0 {
		params.ID = userID
	} else if params.ID != userID {
		h.JSON(resp, http.StatusBadRequest, errors.New("mismatched user id between request and url"))
	}

	err = h.model.Users.UpdatePassword(userID, params.CurrentPassword, params.NewPassword)
	if err != nil {
		h.JSON(resp, http.StatusForbidden, fmt.Errorf("update failed: %v", err))
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) getUserSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, fmt.Errorf("getting user from request: %v", err))
		return
	}

	userSettings, err := h.model.Users.ReadSettings(userID)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, fmt.Errorf("reading user settings: %v", err))
		return
	}

	h.JSON(resp, http.StatusOK, userSettings)
}

func (h apiHandler) putUserSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, fmt.Errorf("getting user from request: %v", err))
		return
	}

	userSettings := new(models.UserSettings)
	if err := readJSONFromRequest(req, userSettings); err != nil {
		h.JSON(resp, http.StatusBadRequest, fmt.Errorf("invalid request: %v", err))
		return
	}

	// Make sure the ID is set in the object
	if userSettings.UserID == 0 {
		userSettings.UserID = userID
	} else if userSettings.UserID != userID {
		h.JSON(resp, http.StatusBadRequest, errors.New("mismatched user id between request and url"))
	}

	if err := h.model.Users.UpdateSettings(userSettings); err != nil {
		h.JSON(resp, http.StatusInternalServerError, fmt.Errorf("updating user settings: %v", err))
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func getUserIDForRequest(p httprouter.Params) (int64, error) {
	// Get the user from the request
	userIDStr := p.ByName("userID")
	// Get the user from the current session
	currentUserIDStr := p.ByName("CurrentUserID")

	// Special case for a URL like /api/v1/users/current
	if userIDStr == "current" {
		userIDStr = currentUserIDStr
	}

	return strconv.ParseInt(userIDStr, 10, 64)
}
