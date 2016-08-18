package models

import "golang.org/x/crypto/bcrypt"

// UserModel provides functionality to edit and authenticate users.
type UserModel struct {
	*Model
}

// User represents an individual user
type User struct {
	ID       int64
	Username string
}

// Authenticate verifies the username and password combination match an existing user
func (m *UserModel) Authenticate(username, password string) (*User, error) {
	user := User{Username: username}
	var passwordHash string

	result := m.db.QueryRow(
		"SELECT id, password_hash FROM app_user WHERE username = $1",
		user.Username)
	err := result.Scan(
		&user.ID,
		&passwordHash)
	if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password))
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (m *UserModel) Read(id int64) (*User, error) {
	user := User{ID: id}

	result := m.db.QueryRow(
		"SELECT username FROM app_user WHERE id = $1",
		user.ID)
	err := result.Scan(
		&user.Username)
	if err != nil {
		return nil, err
	}

	return &user, nil
}
