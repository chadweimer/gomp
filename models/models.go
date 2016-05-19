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

type Model struct {
	cfg *conf.Config
	db  *sql.DB

	Recipes *RecipeModel
	Tags    *TagModel
	Notes   *NoteModel
	Images  *RecipeImageModel
}

func New(cfg *conf.Config) *Model {
	dbPath := fmt.Sprintf("%s/gomp.db", cfg.DataPath)

	// Create the database if it doesn't yet exists.
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		err = createDatabase(cfg.DataPath)
		if err != nil {
			log.Fatal("Failed to create database.", err)
		}
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal("Failed to open database.", err)
	}

	m := &Model{
		cfg: cfg,
		db:  db,
	}
	m.Recipes = &RecipeModel{Model: m}
	m.Tags = &TagModel{Model: m}
	m.Notes = &NoteModel{Model: m}
	m.Images = &RecipeImageModel{Model: m}
	return m
}

func createDatabase(dataPath string) error {
	if _, err := os.Stat(dataPath); os.IsNotExist(err) {
		err = os.Mkdir(dataPath, os.ModePerm)
		if err != nil {
			return err
		}
	}

	allErrs, ok := migrate.UpSync(fmt.Sprintf("sqlite3://%s", fmt.Sprintf("%s/gomp.db", dataPath)), "./db/migrations")
	if !ok {
		errBuffer := new(bytes.Buffer)
		for _, err := range allErrs {
			errBuffer.WriteString(err.Error())
		}

		return errors.New(errBuffer.String())
	}

	return nil
}
