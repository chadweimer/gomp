package models

import (
	"bytes"
	"errors"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/jmoiron/sqlx"
	"github.com/mattes/migrate/migrate"

	// sqlite3 database driver
	_ "github.com/mattes/migrate/driver/sqlite3"
	_ "github.com/mattn/go-sqlite3"

	// postgres database driver
	_ "github.com/lib/pq"
	_ "github.com/mattes/migrate/driver/postgres"
)

// ---- Begin Standard Errors ----

// ErrNotFound represents the error when a database record cannot be
// found matching the criteria specified by the caller
var ErrNotFound = errors.New("No record found matching supplied criteria")

// ---- End Standard Errors ----

const sqlite3Driver = "sqlite3"

// Model encapsulates the model layer of the application, including database access
type Model struct {
	cfg *conf.Config
	db  *sqlx.DB

	Recipes *RecipeModel
	Tags    *TagModel
	Notes   *NoteModel
	Images  *RecipeImageModel
	Users   *UserModel
	Search  *SearchModel
}

// New constructs a new Model object
func New(cfg *conf.Config) *Model {
	dbPath := strings.TrimPrefix(cfg.DatabaseURL, cfg.DatabaseDriver+"://")

	// Create the database if it doesn't yet exists.
	if cfg.DatabaseDriver == sqlite3Driver {
		if _, err := os.Stat(dbPath); os.IsNotExist(err) {
			dbDir := filepath.Dir(dbPath)
			if _, err := os.Stat(dbDir); os.IsNotExist(err) {
				err = os.MkdirAll(dbDir, os.ModePerm)
				if err != nil {
					log.Fatal("Failed to create database folder.", err)
				}
			}
		}
	}

	err := migrateDatabase(cfg.DatabaseDriver, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to migrate database.", err)
	}

	var db *sqlx.DB
	if cfg.DatabaseDriver == sqlite3Driver {
		db, err = sqlx.Connect(cfg.DatabaseDriver, dbPath)
	} else {
		db, err = sqlx.Connect(cfg.DatabaseDriver, cfg.DatabaseURL)
	}
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
	m.Images = NewRecipeImageModel(m)
	m.Users = &UserModel{Model: m}
	m.Search = &SearchModel{Model: m}
	return m
}

func migrateDatabase(databaseDriver, databaseURL string) error {
	allErrs, ok := migrate.UpSync(databaseURL, filepath.Join("db", "migrations", databaseDriver))
	if !ok {
		errBuffer := new(bytes.Buffer)
		for _, err := range allErrs {
			errBuffer.WriteString(err.Error())
		}

		return errors.New(errBuffer.String())
	}

	return nil
}
