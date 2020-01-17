package api

import (
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
		msg := fmt.Sprintf("getting user from request: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	user, err := h.model.Users.Read(userID)
	if err != nil {
		msg := fmt.Sprintf("reading user: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
		return
	}

	h.JSON(resp, http.StatusOK, user)
}

func (h apiHandler) putUserPassword(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		msg := fmt.Sprintf("getting user from request: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	params := new(userPutPasswordParameters)
	if err := readJSONFromRequest(req, params); err != nil {
		msg := fmt.Sprintf("invalid request: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	// Make sure the ID is set in the object
	if params.ID == 0 {
		params.ID = userID
	} else if params.ID != userID {
		msg := "mismatched user id between request and url"
		h.JSON(resp, http.StatusBadRequest, msg)
	}

	err = h.model.Users.UpdatePassword(userID, params.CurrentPassword, params.NewPassword)
	if err != nil {
		msg := fmt.Sprintf("update failed: %v", err)
		h.JSON(resp, http.StatusForbidden, msg)
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) getUserSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		msg := fmt.Sprintf("getting user from request: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	userSettings, err := h.model.Users.ReadSettings(userID)
	if err != nil {
		msg := fmt.Sprintf("reading user settings: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
		return
	}

	h.JSON(resp, http.StatusOK, userSettings)
}

func (h apiHandler) putUserSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		msg := fmt.Sprintf("getting user from request: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	userSettings := new(models.UserSettings)
	if err := readJSONFromRequest(req, userSettings); err != nil {
		msg := fmt.Sprintf("invalid request: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	// Make sure the ID is set in the object
	if userSettings.UserID == 0 {
		userSettings.UserID = userID
	} else if userSettings.UserID != userID {
		msg := "mismatched user id between request and url"
		h.JSON(resp, http.StatusBadRequest, msg)
	}

	if err := h.model.Users.UpdateSettings(userSettings); err != nil {
		msg := fmt.Sprintf("updating user settings: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
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
