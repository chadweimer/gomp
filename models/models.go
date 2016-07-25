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
	cfg               *conf.Config
	db                *sqlx.DB
	previousDbVersion uint64
	currentDbVersion  uint64

	Recipes *RecipeModel
	Tags    *TagModel
	Notes   *NoteModel
	Images  *RecipeImageModel
	Users   *UserModel
	Search  *SearchModel
}

// New constructs a new Model object
func New(cfg *conf.Config) *Model {
	previousDbVersion, newDbVersion, err := migrateDatabase(cfg.DatabaseDriver, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to migrate database.", err)
	}

	db, err := sqlx.Connect(cfg.DatabaseDriver, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to open database.", err)
	}

	m := &Model{
		cfg:               cfg,
		db:                db,
		previousDbVersion: previousDbVersion,
		currentDbVersion:  newDbVersion,
	}
	m.Recipes = &RecipeModel{Model: m}
	m.Tags = &TagModel{Model: m}
	m.Notes = &NoteModel{Model: m}
	m.Images = NewRecipeImageModel(m)
	m.Users = &UserModel{Model: m}
	m.Search = &SearchModel{Model: m}

	err = m.postMigrate()
	if err != nil {
		log.Fatal("Failed to run post-migration steps on database.", err)
	}

	return m
}

func migrateDatabase(databaseDriver, databaseURL string) (uint64, uint64, error) {
	migrationPath := filepath.Join("db", "migrations", databaseDriver)

	previousDbVersion, err := migrate.Version(databaseURL, migrationPath)
	if err != nil {
		return 0, 0, err
	}

	allErrs, ok := migrate.UpSync(databaseURL, migrationPath)
	if !ok {
		errBuffer := new(bytes.Buffer)
		for _, err := range allErrs {
			errBuffer.WriteString(err.Error())
		}

		return 0, 0, errors.New(errBuffer.String())
	}

	newDbVersion, err := migrate.Version(databaseURL, migrationPath)
	if err != nil {
		return 0, 0, err
	}

	return previousDbVersion, newDbVersion, nil
}

func (m *Model) postMigrate() error {
	if m.previousDbVersion == m.currentDbVersion {
		return nil
	}

	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	err = m.Recipes.migrate(tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}
