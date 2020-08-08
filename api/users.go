package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
	"golang.org/x/crypto/bcrypt"
)

type userPostParameters struct {
	Username    string           `json:"username"`
	Password    string           `json:"password"`
	AccessLevel models.UserLevel `json:"accessLevel"`
}

type userPutPasswordParameters struct {
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

	user, err := h.db.Users().Read(userID)
	if err != nil {
		msg := fmt.Sprintf("reading user: %v", err)
		h.JSON(resp, http.StatusInternalServerError, msg)
		return
	}

	h.JSON(resp, http.StatusOK, user)
}

func (h apiHandler) getUsers(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	// Add pagination?
	users, err := h.db.Users().List()
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, users)
}

func (h apiHandler) postUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	newUser := new(userPostParameters)
	if err := readJSONFromRequest(req, newUser); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, errors.New("Invalid password specified"))
		return
	}

	user := models.User{
		Username:     newUser.Username,
		PasswordHash: string(passwordHash),
		AccessLevel:  newUser.AccessLevel,
	}

	if err := h.db.Users().Create(&user); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/users/%d", user.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (h apiHandler) putUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		msg := fmt.Sprintf("getting user from request: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	var user models.User
	if err := readJSONFromRequest(req, &user); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if user.ID != userID {
		h.JSON(resp, http.StatusBadRequest, errMismatchedID.Error())
		return
	}

	if err := h.db.Users().Update(&user); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) deleteUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		msg := fmt.Sprintf("getting user from request: %v", err)
		h.JSON(resp, http.StatusBadRequest, msg)
		return
	}

	if err := h.db.Users().Delete(userID); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
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

	err = h.db.Users().UpdatePassword(userID, params.CurrentPassword, params.NewPassword)
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

	userSettings, err := h.db.Users().ReadSettings(userID)
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

	if err := h.db.Users().UpdateSettings(userSettings); err != nil {
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
