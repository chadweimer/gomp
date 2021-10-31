package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/models"
	"golang.org/x/crypto/bcrypt"
)

func (h *apiHandler) getUser(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	user, err := h.db.Users().Read(userId)
	if err != nil {
		fullErr := fmt.Errorf("reading user: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(resp, user)
}

func (h *apiHandler) getUsers(resp http.ResponseWriter, req *http.Request) {
	// Add pagination?
	users, err := h.db.Users().List()
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, users)
}

func (h *apiHandler) postUser(resp http.ResponseWriter, req *http.Request) {
	newUser := new(models.UserWithPassword)
	if err := readJSONFromRequest(req, newUser); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, errors.New("invalid password specified"))
		return
	}

	user := new(db.UserWithPasswordHash)
	user.Username = newUser.Username
	user.PasswordHash = string(passwordHash)
	user.AccessLevel = newUser.AccessLevel

	if err := h.db.Users().Create(user); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, user)
}

func (h *apiHandler) putUser(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
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

	if user.Id == nil {
		user.Id = &userId
	} else if *user.Id != userId {
		h.Error(resp, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Users().Update(&user); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) deleteUser(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	if err := h.db.Users().Delete(userId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) putUserPassword(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	params := new(models.UserPasswordRequest)
	if err := readJSONFromRequest(req, params); err != nil {
		fullErr := fmt.Errorf("invalid request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	err = h.db.Users().UpdatePassword(userId, params.CurrentPassword, params.NewPassword)
	if err != nil {
		fullErr := fmt.Errorf("update failed: %v", err)
		h.Error(resp, http.StatusForbidden, fullErr)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) getUserSettings(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	userSettings, err := h.db.Users().ReadSettings(userId)
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

func (h *apiHandler) putUserSettings(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
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
	if userSettings.UserId == nil {
		userSettings.UserId = &userId
	} else if *userSettings.UserId != userId {
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

func (h *apiHandler) getUserFilters(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	searches, err := h.db.Users().ListSearchFilters(userId)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, searches)
}

func (h *apiHandler) postUserFilter(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
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
	if filter.UserId == nil {
		filter.UserId = &userId
	} else if *filter.UserId != userId {
		h.Error(resp, http.StatusBadRequest, errMismatchedId)
	}

	if err := h.db.Users().CreateSearchFilter(&filter); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, filter)
}

func (h *apiHandler) getUserFilter(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	filterId, err := getResourceIdFromUrl(req, filterIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	filter, err := h.db.Users().ReadSearchFilter(userId, filterId)
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

func (h *apiHandler) putUserFilter(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	filterId, err := getResourceIdFromUrl(req, filterIdKey)
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
	if filter.Id == nil {
		filter.Id = &filterId
	} else if *filter.Id != filterId {
		h.Error(resp, http.StatusBadRequest, errMismatchedId)
		return
	}

	// Make sure the UserId is set in the object
	if filter.UserId == nil {
		filter.UserId = &userId
	} else if *filter.UserId != userId {
		h.Error(resp, http.StatusBadRequest, errMismatchedId)
		return
	}

	// Check that the filter exists for the specified user
	_, err = h.db.Users().ReadSearchFilter(userId, filterId)
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

func (h *apiHandler) deleteUserFilter(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromUrl(req, userIdKey)
	if err != nil {
		fullErr := fmt.Errorf("getting user from request: %v", err)
		h.Error(resp, http.StatusBadRequest, fullErr)
		return
	}

	filterId, err := getResourceIdFromUrl(req, filterIdKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Users().DeleteSearchFilter(userId, filterId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
