package models

import "golang.org/x/crypto/bcrypt"

// UserModel provides functionality to edit and authenticate users.
type UserModel struct {
	*Model
}

// User represents an individual user
type User struct {
	ID           int64  `db:"id"`
	Username     string `db:"username"`
	PasswordHash string `db:"password_hash"`
}

// UserSettings represents the settings for an individual user
type UserSettings struct {
	UserID       int64  `json:"userId" db:"user_id"`
	HomeTitle    string `json:"homeTitle" db:"home_title"`
	HomeImageURL string `json:"homeImageUrl" db:"home_image_url"`
}

// Authenticate verifies the username and password combination match an existing user
func (m *UserModel) Authenticate(username, password string) (*User, error) {
	user := new(User)

	if err := m.db.Get(user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, err
	}

	return user, nil
}

func (m *UserModel) Read(id int64) (*User, error) {
	user := new(User)

	if err := m.db.Select(user, "SELECT * FROM app_user WHERE id = $1", id); err != nil {
		return nil, err
	}

	return user, nil
}

// ReadSettings retrieves the settings for the specified user from the database, if found.
// If no user exists with the specified ID, a NoRecordFound error is returned.
func (m *UserModel) ReadSettings(id int64) (*UserSettings, error) {
	userSettings := new(UserSettings)

	if err := m.db.Get(userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
	}

	return userSettings, nil
}
