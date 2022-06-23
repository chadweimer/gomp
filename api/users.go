package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/api/admin"
	"github.com/chadweimer/gomp/generated/api/adminOrSelf"
	"github.com/chadweimer/gomp/generated/models"
	"golang.org/x/crypto/bcrypt"
)

func (h apiHandler) GetCurrentUser(resp http.ResponseWriter, req *http.Request) {
	userId, err := getResourceIdFromCtx(req, currentUserIdCtxKey)
	if err != nil {
		h.Error(resp, req, http.StatusUnauthorized, err)
		return
	}

	h.GetUser(resp, req, userId)
}

func (h apiHandler) GetUser(resp http.ResponseWriter, req *http.Request, userId int64) {
	user, err := h.db.Users().Read(userId)
	if err != nil {
		fullErr := fmt.Errorf("reading user: %v", err)
		h.Error(resp, req, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(resp, user)
}

func (h apiHandler) GetAllUsers(resp http.ResponseWriter, req *http.Request) {
	// Add pagination?
	users, err := h.db.Users().List()
	if err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, users)
}

func (h apiHandler) AddUser(resp http.ResponseWriter, req *http.Request) {
	var newUser admin.UserWithPassword
	if err := readJSONFromRequest(req, &newUser); err != nil {
		h.Error(resp, req, http.StatusBadRequest, err)
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		h.Error(resp, req, http.StatusInternalServerError, errors.New("invalid password specified"))
		return
	}

	user := db.UserWithPasswordHash{
		User:         newUser.User,
		PasswordHash: string(passwordHash),
	}

	if err := h.db.Users().Create(&user); err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, user)
}

func (h apiHandler) SaveUser(resp http.ResponseWriter, req *http.Request, userId int64) {
	var user models.User
	if err := readJSONFromRequest(req, &user); err != nil {
		h.Error(resp, req, http.StatusBadRequest, err)
		return
	}

	if user.Id == nil {
		user.Id = &userId
	} else if *user.Id != userId {
		h.Error(resp, req, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Users().Update(&user); err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) DeleteUser(resp http.ResponseWriter, req *http.Request, userId int64) {
	currentUserId, err := getResourceIdFromCtx(req, currentUserIdCtxKey)
	if err != nil {
		h.Error(resp, req, http.StatusUnauthorized, err)
		return
	}

	// Don't allow deleting self
	if userId == currentUserId {
		err := fmt.Errorf("endpoint '%s' disallowed on current user", req.URL.Path)
		h.Error(resp, req, http.StatusForbidden, err)
		return
	}

	if err := h.db.Users().Delete(userId); err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) ChangePassword(resp http.ResponseWriter, req *http.Request, userId int64) {
	params := new(adminOrSelf.UserPasswordRequest)
	if err := readJSONFromRequest(req, params); err != nil {
		fullErr := fmt.Errorf("invalid request: %v", err)
		h.Error(resp, req, http.StatusBadRequest, fullErr)
		return
	}

	if err := h.db.Users().UpdatePassword(userId, params.CurrentPassword, params.NewPassword); err != nil {
		fullErr := fmt.Errorf("update failed: %v", err)
		h.Error(resp, req, http.StatusForbidden, fullErr)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) GetSettings(resp http.ResponseWriter, req *http.Request, userId int64) {
	userSettings, err := h.db.Users().ReadSettings(userId)
	if err != nil {
		fullErr := fmt.Errorf("reading user settings: %v", err)
		h.Error(resp, req, http.StatusInternalServerError, fullErr)
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

func (h apiHandler) SaveSettings(resp http.ResponseWriter, req *http.Request, userId int64) {
	var userSettings models.UserSettings
	if err := readJSONFromRequest(req, &userSettings); err != nil {
		fullErr := fmt.Errorf("invalid request: %v", err)
		h.Error(resp, req, http.StatusBadRequest, fullErr)
		return
	}

	// Make sure the ID is set in the object
	if userSettings.UserId == nil {
		userSettings.UserId = &userId
	} else if *userSettings.UserId != userId {
		err := errors.New("mismatched user id between request and url")
		h.Error(resp, req, http.StatusBadRequest, err)
	}

	if err := h.db.Users().UpdateSettings(&userSettings); err != nil {
		fullErr := fmt.Errorf("updating user settings: %v", err)
		h.Error(resp, req, http.StatusInternalServerError, fullErr)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) GetSearchFilters(resp http.ResponseWriter, req *http.Request, userId int64) {
	searches, err := h.db.Users().ListSearchFilters(userId)
	if err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, searches)
}

func (h apiHandler) AddSearchFilter(resp http.ResponseWriter, req *http.Request, userId int64) {
	var filter models.SavedSearchFilter
	if err := readJSONFromRequest(req, &filter); err != nil {
		h.Error(resp, req, http.StatusBadRequest, err)
		return
	}

	// Make sure the ID is set in the object
	if filter.UserId == nil {
		filter.UserId = &userId
	} else if *filter.UserId != userId {
		h.Error(resp, req, http.StatusBadRequest, errMismatchedId)
	}

	if err := h.db.Users().CreateSearchFilter(&filter); err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, filter)
}

func (h apiHandler) GetSearchFilter(resp http.ResponseWriter, req *http.Request, userId int64, filterId int64) {
	filter, err := h.db.Users().ReadSearchFilter(userId, filterId)
	if err == db.ErrNotFound {
		h.Error(resp, req, http.StatusNotFound, err)
		return
	}
	if err != nil {
		fullErr := fmt.Errorf("reading filter: %v", err)
		h.Error(resp, req, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(resp, filter)
}

func (h apiHandler) SaveSearchFilter(resp http.ResponseWriter, req *http.Request, userId int64, filterId int64) {
	var filter models.SavedSearchFilter
	if err := readJSONFromRequest(req, &filter); err != nil {
		h.Error(resp, req, http.StatusBadRequest, err)
		return
	}

	// Make sure the ID is set in the object
	if filter.Id == nil {
		filter.Id = &filterId
	} else if *filter.Id != filterId {
		h.Error(resp, req, http.StatusBadRequest, errMismatchedId)
		return
	}

	// Make sure the UserId is set in the object
	if filter.UserId == nil {
		filter.UserId = &userId
	} else if *filter.UserId != userId {
		h.Error(resp, req, http.StatusBadRequest, errMismatchedId)
		return
	}

	// Check that the filter exists for the specified user
	_, err := h.db.Users().ReadSearchFilter(userId, filterId)
	if err == db.ErrNotFound {
		h.Error(resp, req, http.StatusNotFound, err)
		return
	}
	if err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	if err := h.db.Users().UpdateSearchFilter(&filter); err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) DeleteSearchFilter(resp http.ResponseWriter, req *http.Request, userId int64, filterId int64) {
	if err := h.db.Users().DeleteSearchFilter(userId, filterId); err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
