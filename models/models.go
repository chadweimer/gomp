package models

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/mattes/migrate/migrate"

	// sqlite3 database driver
	_ "github.com/mattes/migrate/driver/sqlite3"
	_ "github.com/mattn/go-sqlite3"

	// postres database driver
	_ "github.com/lib/pq"
)

// ---- Begin Standard Errors ----

// ErrNotFound represents the error when a database record cannot be
// found matching the criteria specified by the caller
var ErrNotFound = errors.New("No record found matching supplied criteria")

// ---- End Standard Errors ----

// Model encapsulates the model layer of the application, including database access
type Model struct {
	cfg *conf.Config
	db  *sql.DB

	Recipes *RecipeModel
	Tags    *TagModel
	Notes   *NoteModel
	Images  *RecipeImageModel
}

// New constructs a new Model object
func New(cfg *conf.Config) *Model {
	// Create the database if it doesn't yet exists.
	if _, err := os.Stat(cfg.DatabaseURL); os.IsNotExist(err) {
		err = createDatabase(cfg.DatabaseDriver, cfg.DatabaseURL)
		if err != nil {
			log.Fatal("Failed to create database.", err)
		}
	} else {
		err = migrateDatabase(cfg.DatabaseDriver, cfg.DatabaseURL)
		if err != nil {
			log.Fatal("Failed to migrate database.", err)
		}
	}

	db, err := sql.Open(cfg.DatabaseDriver, cfg.DatabaseURL)
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

func createDatabase(databaseDriver, databaseURL string) error {
	dbDir := filepath.Dir(databaseURL)
	if _, err := os.Stat(dbDir); os.IsNotExist(err) {
		err = os.Mkdir(dbDir, os.ModePerm)
		if err != nil {
			return err
		}
	}

	return migrateDatabase(databaseDriver, databaseURL)
}

func migrateDatabase(databaseDriver, databaseURL string) error {
	allErrs, ok := migrate.UpSync(fmt.Sprintf("%s://%s", databaseDriver, databaseURL), "./db/migrations")
	if !ok {
		errBuffer := new(bytes.Buffer)
		for _, err := range allErrs {
			errBuffer.WriteString(err.Error())
		}

		return errors.New(errBuffer.String())
	}

	return nil
}
