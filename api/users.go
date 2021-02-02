package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/db"
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

func (h *apiHandler) getUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	user, err := h.db.Users().Read(userID)
	if err != nil {
		fullErr := fmt.Errorf("reading user: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(resp, user)
}

func (h *apiHandler) getUsers(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	// Add pagination?
	users, err := h.db.Users().List()
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, users)
}

func (h *apiHandler) postUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	newUser := new(userPostParameters)
	if err := readJSONFromRequest(req, newUser); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, errors.New("Invalid password specified"))
		return
	}

	user := models.User{
		Username:     newUser.Username,
		PasswordHash: string(passwordHash),
		AccessLevel:  newUser.AccessLevel,
	}

	if err := h.db.Users().Create(&user); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, fmt.Sprintf("/api/v1/users/%d", user.ID))
}

func (h *apiHandler) putUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	var user models.User
	if err := readJSONFromRequest(req, &user); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if user.ID != userID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
		return
	}

	if err := h.db.Users().Update(&user); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) deleteUser(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	if err := h.db.Users().Delete(userID); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) putUserPassword(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	params := new(userPutPasswordParameters)
	if err := readJSONFromRequest(req, params); err != nil {
		fullErr := fmt.Errorf("invalid request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	err = h.db.Users().UpdatePassword(userID, params.CurrentPassword, params.NewPassword)
	if err != nil {
		fullErr := fmt.Errorf("update failed: %v", err)
		h.Error(resp, http.StatusForbidden, fullErr)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) getUserSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	userSettings, err := h.db.Users().ReadSettings(userID)
	if err != nil {
		fullErr := fmt.Errorf("reading user settings: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	// Default to the application title if the user hasn't set their own
	if userSettings.HomeTitle == nil {
		if cfg, err := h.db.AppConfiguration().Read(); err == nil {
			userSettings.HomeTitle = &cfg.Title
		}
	}

	h.OK(resp, userSettings)
}

func (h *apiHandler) putUserSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	userSettings := new(models.UserSettings)
	if err := readJSONFromRequest(req, userSettings); err != nil {
		fullErr := fmt.Errorf("invalid request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	// Make sure the ID is set in the object
	if userSettings.UserID == 0 {
		userSettings.UserID = userID
	} else if userSettings.UserID != userID {
		err := errors.New("mismatched user id between request and url")
		h.Error(resp, http.StatusBadRequest, err)
	}

	if err := h.db.Users().UpdateSettings(userSettings); err != nil {
		fullErr := fmt.Errorf("updating user settings: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.NoContent(resp)
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

func (h *apiHandler) getUserFilters(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	searches, err := h.db.Users().ListSearchFilters(userID)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, searches)
}

func (h *apiHandler) postUserFilter(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	var filter models.SavedSearchFilter
	if err := readJSONFromRequest(req, &filter); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	// Make sure the ID is set in the object
	if filter.UserID == 0 {
		filter.UserID = userID
	} else if filter.UserID != userID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
	}

	if err := h.db.Users().CreateSearchFilter(&filter); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, fmt.Sprintf("/api/v1/users/%d/filters/%d", filter.UserID, filter.ID))
}

func (h *apiHandler) getUserFilter(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	filterID, err := strconv.ParseInt(p.ByName("filterID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	filter, err := h.db.Users().ReadSearchFilter(userID, filterID)
	if err == db.ErrNotFound {
		h.Error(resp, http.StatusNotFound, err)
		return
	}
	if err != nil {
		fullErr := fmt.Errorf("reading filter: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(resp, filter)
}

func (h *apiHandler) putUserFilter(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	filterID, err := strconv.ParseInt(p.ByName("filterID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var filter models.SavedSearchFilter
	if err := readJSONFromRequest(req, &filter); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	// Make sure the ID is set in the object
	if filter.ID == 0 {
		filter.ID = filterID
	} else if filter.ID != filterID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
		return
	}

	// Make sure the UserID is set in the object
	if filter.UserID == 0 {
		filter.UserID = userID
	} else if filter.UserID != userID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
		return
	}

	// Check that the filter exists for the specified user
	_, err = h.db.Users().ReadSearchFilter(userID, filterID)
	if err == db.ErrNotFound {
		h.Error(resp, http.StatusNotFound, err)
		return
	}
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	if err := h.db.Users().UpdateSearchFilter(&filter); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) deleteUserFilter(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	userID, err := getUserIDForRequest(p)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	filterID, err := strconv.ParseInt(p.ByName("filterID"), 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Users().DeleteSearchFilter(userID, filterID); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
