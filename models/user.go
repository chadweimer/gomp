package models

import (
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type UserModel struct {
	*Model
}

type User struct {
	ID       int64
	Username string
}

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

func (m *UserModel) Create(username, password string) error {
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	err = m.CreateTx(username, password, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (m *UserModel) CreateTx(username, password string, tx *sqlx.Tx) error {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		"INSERT INTO app_user (username, password_hash) VALUES ($1, $2)",
		username, passwordHash)
	if err != nil {
		return err
	}

	return nil
}
