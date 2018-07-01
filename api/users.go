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
	userIDStr := p.ByName("userID")

	// Special case for a URL like /api/v1/users/current
	if userIDStr == "current" {
		userIDStr = p.ByName("CurrentUserID")
	}

	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	user, err := h.model.Users.Read(userID)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, user)
}

func (h apiHandler) getUsers(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	// Add pagination?
	users, err := h.model.Users.List()
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

	if err := h.model.Users.Create(&user); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/users/%d", user.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (h apiHandler) putUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userIDStr := p.ByName("userID")

	// Special case for a URL like /api/v1/users/current
	if userIDStr == "current" {
		userIDStr = p.ByName("CurrentUserID")
	}

	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
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

	if err := h.model.Users.Update(&user); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) putUserPassword(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userIDStr := p.ByName("userID")

	// Special case for a URL like /api/v1/users/current
	if userIDStr == "current" {
		userIDStr = p.ByName("CurrentUserID")
	}

	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	params := new(userPutPasswordParameters)
	if err := readJSONFromRequest(req, params); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	err = h.model.Users.UpdatePassword(userID, params.CurrentPassword, params.NewPassword)
	if err != nil {
		h.JSON(resp, http.StatusForbidden, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

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
