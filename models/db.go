package models

import (
	"database/sql"

	// sqlite3 database driver
	_ "github.com/mattn/go-sqlite3"
)

func OpenDatabase() (*sql.DB, error) {
	db, err := sql.Open("sqlite3", "./data/gomp.db")

	return db, err
}
