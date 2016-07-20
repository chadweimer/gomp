package models

import (
	"bytes"
	"errors"
	"log"
	"path/filepath"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/jmoiron/sqlx"
	"github.com/mattes/migrate/migrate"

	// postgres database driver
	_ "github.com/lib/pq"
	_ "github.com/mattes/migrate/driver/postgres"
)

// ---- Begin Standard Errors ----

// ErrNotFound represents the error when a database record cannot be
// found matching the criteria specified by the caller
var ErrNotFound = errors.New("No record found matching supplied criteria")

// ---- End Standard Errors ----

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
	err := migrateDatabase(cfg.DatabaseDriver, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to migrate database.", err)
	}

	db, err := sqlx.Connect(cfg.DatabaseDriver, cfg.DatabaseURL)
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
