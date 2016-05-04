package models

import (
	"database/sql"

	// sqlite3 database driver
	_ "github.com/mattn/go-sqlite3"
)

// DbTx represents an abstraction of sql.DB and sql.Tx
type DbTx interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	Query(query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(query string, args ...interface{}) *sql.Row
}

// OpenDatabase returns a sql.DB instance attached to the database
func OpenDatabase() (*sql.DB, error) {
	db, err := sql.Open("sqlite3", "./data/gomp.db")

	return db, err
}
