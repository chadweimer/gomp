package models

import (
	"bytes"
	"errors"
	"log"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/upload"
	"github.com/jmoiron/sqlx"
	"gopkg.in/mattes/migrate.v1/migrate"

	// postgres database driver
	_ "github.com/lib/pq"
	_ "gopkg.in/mattes/migrate.v1/driver/postgres"
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
func New(cfg *conf.Config, upl upload.Driver) *Model {
	// In docker, on first bring up, the DB takes a little while.
	// Let's try a few times to establish connection before giving up.
	const maxAttempts = 20
	var db *sqlx.DB
	var err error
	for i := 1; i <= maxAttempts; i++ {
		db, err = sqlx.Connect(cfg.DatabaseDriver, cfg.DatabaseURL)
		if err != nil {
			if i < maxAttempts {
				log.Printf("Failed to open database on attempt %d: '%+v'. Will try again...", i, err)
				time.Sleep(500 * time.Millisecond)
			} else {
				log.Fatalf("Failed to open database on attempt %d: '%+v'. Giving up.", i, err)
			}
		}
	}

	previousDbVersion, newDbVersion, err := migrateDatabase(cfg.DatabaseDriver, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to migrate database", err)
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
	m.Images = &RecipeImageModel{Model: m, upl: upl}
	m.Users = &UserModel{Model: m}
	m.Search = &SearchModel{Model: m}

	return m
}

// TearDown closes the connection to the database.
func (m *Model) TearDown() {
	if m.db != nil {
		log.Print("Closing database connection...")
		if err := m.db.Close(); err != nil {
			log.Fatal("Failed to close the connection to the database.", err)
		}
	}
}

func (m *Model) tx(op func(*sqlx.Tx) error) error {
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}
	defer func() {
		if recv := recover(); recv != nil {
			// Make sure to rollback after a panic...
			tx.Rollback()

			// ... but let the panicing continue
			panic(recv)
		}
	}()

	if err = op(tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
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

func containsString(arr []string, str string) bool {
	for _, a := range arr {
		if a == str {
			return true
		}
	}
	return false
 }