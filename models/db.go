package models

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/mattes/migrate/migrate"

	// sqlite3 database driver
	_ "github.com/mattes/migrate/driver/sqlite3"
	_ "github.com/mattn/go-sqlite3"
)

// ---- Begin Standard Errors ----

// ErrNotFound represents the error when a database record cannot be
// found matching the criteria specified by the caller
var ErrNotFound = errors.New("No record found matching supplied criteria")

// ---- End Standard Errors ----

var db *sql.DB
var dbPath string

func init() {
	dbPath = fmt.Sprintf("%s/gomp.db", conf.DataPath())

	// Create the database if it doesn't yet exists.
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		err = createDatabase()
		if err != nil {
			log.Fatal("Failed to create database.", err)
		}
	}

	err := openDatabase()
	if err != nil {
		log.Fatal("Failed to open database.", err)
	}
}

func createDatabase() error {
	if _, err := os.Stat(conf.DataPath()); os.IsNotExist(err) {
		err = os.Mkdir(conf.DataPath(), os.ModePerm)
		if err != nil {
			return err
		}
	}

	allErrs, ok := migrate.UpSync(fmt.Sprintf("sqlite3://%s", dbPath), "./db/migrations")
	if !ok {
		errBuffer := new(bytes.Buffer)
		for _, err := range allErrs {
			errBuffer.WriteString(err.Error())
		}

		return errors.New(errBuffer.String())
	}

	return nil
}

func openDatabase() error {
	var err error
	db, err = sql.Open("sqlite3", dbPath)
	return err
}
