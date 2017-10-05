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

	if err := m.db.Select(user, "SELECT * FROM app_user WHERE id = $1", user.ID); err != nil {
		return nil, err
	}

	return user, nil
}
