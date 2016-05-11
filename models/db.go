package models

import (
	"bytes"
	"database/sql"
	"errors"
	"os"

	"github.com/mattes/migrate/migrate"

	// sqlite3 database driver
	_ "github.com/mattes/migrate/driver/sqlite3"
	_ "github.com/mattn/go-sqlite3"
)

type Database struct {
	Sql *sql.DB
}

// DbTx represents an abstraction of sql.DB and sql.Tx
type DbTx interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	Query(query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(query string, args ...interface{}) *sql.Row
}

var DB = new(Database)

func init() {
	if _, err := os.Stat("data/gomp.db"); os.IsNotExist(err) {
		err = DB.migrateUp()
		if err != nil {
			panic(err)
		}
	}

	err := DB.open()
	if err != nil {
		panic(err)
	}
}

// MigrateUp will perform any and all outstanding up database migrations
func (db *Database) migrateUp() error {
	if _, err := os.Stat("data"); os.IsNotExist(err) {
		err = os.Mkdir("data", os.ModePerm)
		if err != nil {
			return err
		}
	}

	allErrs, ok := migrate.UpSync("sqlite3://data/gomp.db", "./db/migrations")
	if !ok {
		errBuffer := new(bytes.Buffer)
		for _, err := range allErrs {
			errBuffer.WriteString(err.Error())
		}

		return errors.New(errBuffer.String())
	}

	return nil
}

// Open returns a sql.DB instance attached to the database
func (db *Database) open() error {
	sqlDB, err := sql.Open("sqlite3", "data/gomp.db")
	if err != nil {
		return err
	}

	db.Sql = sqlDB
	return nil
}
