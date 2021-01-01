package models

import (
	"database/sql/driver"
	"errors"
)

// UserLevel represents an enumeration of access levels that a user can have.
type UserLevel string

const (
	// AdminUserLevel represents an application-wide administator
	AdminUserLevel UserLevel = "admin"

	// EditorUserLevel represents a user that can add and editor recipes
	EditorUserLevel UserLevel = "editor"

	// ViewerUserLevel represents a user that can only view recipes
	ViewerUserLevel UserLevel = "viewer"
)

// User represents an individual user
type User struct {
	ID           int64     `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	PasswordHash string    `json:"-" db:"password_hash"`
	AccessLevel  UserLevel `json:"accessLevel" db:"access_level"`
}

// UserSettings represents the settings for an individual user
type UserSettings struct {
	UserID       int64   `json:"userId" db:"user_id"`
	HomeTitle    *string `json:"homeTitle" db:"home_title"`
	HomeImageURL *string `json:"homeImageUrl" db:"home_image_url"`
}

// Scan implements the sql.Scanner interface
func (u *UserLevel) Scan(value interface{}) error {
	switch v := value.(type) {
	case string:
		*u = UserLevel(v)
	case []byte:
		*u = UserLevel(string(v))
	default:
		return errors.New("Scan source is not a supported type")
	}

	return nil
}

// Value implements the sql/driver.Valuer interface
func (u UserLevel) Value() (driver.Value, error) {
	return string(u), nil
}
