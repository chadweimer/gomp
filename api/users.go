package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/generated/models"
	"github.com/chadweimer/gomp/generated/oapi"
	"golang.org/x/crypto/bcrypt"
)

func (h apiHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	h.current(w, r, func(userId int64) {
		h.GetUser(w, r, userId)
	})
}

func (h apiHandler) GetUser(w http.ResponseWriter, r *http.Request, userId int64) {
	user, err := h.db.Users().Read(userId)
	if err != nil {
		fullErr := fmt.Errorf("reading user: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(w, r, user)
}

func (h apiHandler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	// Add pagination?
	users, err := h.db.Users().List()
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, r, users)
}

func (h apiHandler) AddUser(w http.ResponseWriter, r *http.Request) {
	var newUser oapi.UserWithPassword
	if err := readJSONFromRequest(r, &newUser); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, errors.New("invalid password specified"))
		return
	}

	user := db.UserWithPasswordHash{
		User:         newUser.User,
		PasswordHash: string(passwordHash),
	}

	if err := h.db.Users().Create(&user); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.Created(w, r, user)
}

func (h apiHandler) SaveUser(w http.ResponseWriter, r *http.Request, userId int64) {
	var user models.User
	if err := readJSONFromRequest(r, &user); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	if user.Id == nil {
		user.Id = &userId
	} else if *user.Id != userId {
		h.Error(w, r, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Users().Update(&user); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) DeleteUser(w http.ResponseWriter, r *http.Request, userId int64) {
	currentUserId, err := getResourceIdFromCtx(r, currentUserIdCtxKey)
	if err != nil {
		h.Error(w, r, http.StatusUnauthorized, err)
		return
	}

	// Don't allow deleting self
	if userId == currentUserId {
		err := fmt.Errorf("endpoint '%s' disallowed on current user", r.URL.Path)
		h.Error(w, r, http.StatusForbidden, err)
		return
	}

	if err := h.db.Users().Delete(userId); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	h.current(w, r, func(userId int64) {
		h.ChangeUserPassword(w, r, userId)
	})
}

func (h apiHandler) ChangeUserPassword(w http.ResponseWriter, r *http.Request, userId int64) {
	params := new(oapi.UserPasswordRequest)
	if err := readJSONFromRequest(r, params); err != nil {
		fullErr := fmt.Errorf("invalid request: %w", err)
		h.Error(w, r, http.StatusBadRequest, fullErr)
		return
	}

	if err := h.db.Users().UpdatePassword(userId, params.CurrentPassword, params.NewPassword); err != nil {
		fullErr := fmt.Errorf("update failed: %w", err)
		h.Error(w, r, http.StatusForbidden, fullErr)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	h.current(w, r, func(userId int64) {
		h.GetUserSettings(w, r, userId)
	})
}

func (h apiHandler) GetUserSettings(w http.ResponseWriter, r *http.Request, userId int64) {
	userSettings, err := h.db.Users().ReadSettings(userId)
	if err != nil {
		fullErr := fmt.Errorf("reading user settings: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	// Default to the application title if the user hasn't set their own
	if userSettings.HomeTitle == nil {
		if cfg, err := h.db.AppConfiguration().Read(); err == nil {
			userSettings.HomeTitle = &cfg.Title
		}
	}

	h.OK(w, r, userSettings)
}

func (h apiHandler) SaveSettings(w http.ResponseWriter, r *http.Request) {
	h.current(w, r, func(userId int64) {
		h.SaveUserSettings(w, r, userId)
	})
}

func (h apiHandler) SaveUserSettings(w http.ResponseWriter, r *http.Request, userId int64) {
	var userSettings models.UserSettings
	if err := readJSONFromRequest(r, &userSettings); err != nil {
		fullErr := fmt.Errorf("invalid request: %w", err)
		h.Error(w, r, http.StatusBadRequest, fullErr)
		return
	}

	// Make sure the ID is set in the object
	if userSettings.UserId == nil {
		userSettings.UserId = &userId
	} else if *userSettings.UserId != userId {
		err := errors.New("mismatched user id between request and url")
		h.Error(w, r, http.StatusBadRequest, err)
	}

	if err := h.db.Users().UpdateSettings(&userSettings); err != nil {
		fullErr := fmt.Errorf("updating user settings: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) GetSearchFilters(w http.ResponseWriter, r *http.Request) {
	h.current(w, r, func(userId int64) {
		h.GetUserSearchFilters(w, r, userId)
	})
}

func (h apiHandler) GetUserSearchFilters(w http.ResponseWriter, r *http.Request, userId int64) {
	searches, err := h.db.Users().ListSearchFilters(userId)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, r, searches)
}

func (h apiHandler) AddSearchFilter(w http.ResponseWriter, r *http.Request) {
	h.current(w, r, func(userId int64) {
		h.AddUserSearchFilter(w, r, userId)
	})
}

func (h apiHandler) AddUserSearchFilter(w http.ResponseWriter, r *http.Request, userId int64) {
	var filter models.SavedSearchFilter
	if err := readJSONFromRequest(r, &filter); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	// Make sure the ID is set in the object
	if filter.UserId == nil {
		filter.UserId = &userId
	} else if *filter.UserId != userId {
		h.Error(w, r, http.StatusBadRequest, errMismatchedId)
	}

	if err := h.db.Users().CreateSearchFilter(&filter); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.Created(w, r, filter)
}

func (h apiHandler) GetSearchFilter(w http.ResponseWriter, r *http.Request, filterId int64) {
	h.current(w, r, func(userId int64) {
		h.GetUserSearchFilter(w, r, userId, filterId)
	})
}

func (h apiHandler) GetUserSearchFilter(w http.ResponseWriter, r *http.Request, userId int64, filterId int64) {
	filter, err := h.db.Users().ReadSearchFilter(userId, filterId)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, fmt.Errorf("reading filter: %w", err))
		return
	}

	h.OK(w, r, filter)
}

func (h apiHandler) SaveSearchFilter(w http.ResponseWriter, r *http.Request, filterId int64) {
	h.current(w, r, func(userId int64) {
		h.SaveUserSearchFilter(w, r, userId, filterId)
	})
}

func (h apiHandler) SaveUserSearchFilter(w http.ResponseWriter, r *http.Request, userId int64, filterId int64) {
	var filter models.SavedSearchFilter
	if err := readJSONFromRequest(r, &filter); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	// Make sure the ID is set in the object
	if filter.Id == nil {
		filter.Id = &filterId
	} else if *filter.Id != filterId {
		h.Error(w, r, http.StatusBadRequest, errMismatchedId)
		return
	}

	// Make sure the UserId is set in the object
	if filter.UserId == nil {
		filter.UserId = &userId
	} else if *filter.UserId != userId {
		h.Error(w, r, http.StatusBadRequest, errMismatchedId)
		return
	}

	// Check that the filter exists for the specified user
	if _, err := h.db.Users().ReadSearchFilter(userId, filterId); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	if err := h.db.Users().UpdateSearchFilter(&filter); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) DeleteSearchFilter(w http.ResponseWriter, r *http.Request, filterId int64) {
	h.current(w, r, func(userId int64) {
		h.DeleteUserSearchFilter(w, r, userId, filterId)
	})
}

func (h apiHandler) DeleteUserSearchFilter(w http.ResponseWriter, r *http.Request, userId int64, filterId int64) {
	if err := h.db.Users().DeleteSearchFilter(userId, filterId); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) current(w http.ResponseWriter, r *http.Request, do func(userId int64)) {
	userId, err := getResourceIdFromCtx(r, currentUserIdCtxKey)
	if err != nil {
		h.Error(w, r, http.StatusUnauthorized, err)
		return
	}

	do(userId)
}
