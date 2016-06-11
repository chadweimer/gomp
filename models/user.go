package models

import (
	"database/sql"

	"golang.org/x/crypto/bcrypt"
)

type UserModel struct {
	*Model
}

type User struct {
	ID           int64
	Username     string
	PasswordHash string
}

func (m *UserModel) Authenticate(username, password string) (*User, error) {
	user := User{Username: username}

	result := m.db.QueryRow(
		"SELECT id, passwordHash FROM user WHERE user.username = $1",
		user.Username)
	err := result.Scan(
		&user.ID,
		&user.PasswordHash)
	if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (m *UserModel) Create(username, password string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.CreateTx(username, password, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (m *UserModel) CreateTx(username, password string, tx *sql.Tx) error {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		"INSERT INTO user (username, password_hash) VALUES ($1, $2)",
		username, passwordHash)
	if err != nil {
		return err
	}

	return nil
}
