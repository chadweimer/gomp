package models

import (
	"database/sql"

	// sqlite3 database driver
	_ "github.com/mattn/go-sqlite3"
)

type DbTx interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	Query(query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(query string, args ...interface{}) *sql.Row
}

func OpenDatabase() (*sql.DB, error) {
	db, err := sql.Open("sqlite3", "./data/gomp.db")

	return db, err
}
