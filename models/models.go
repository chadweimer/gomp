package models

import (
	"bytes"
	"context"
	"database/sql"
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
	cfg *conf.Config
	db  *sqlx.DB

	Recipes *RecipeModel
	Tags    *TagModel
	Notes   *NoteModel
	Images  *RecipeImageModel
	Links   *RecipeLinkModel
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
		if err == nil {
			break
		}

		if i < maxAttempts {
			log.Printf("Failed to open database on attempt %d: '%+v'. Will try again...", i, err)
			time.Sleep(500 * time.Millisecond)
		} else {
			log.Fatalf("Failed to open database on attempt %d: '%+v'. Giving up.", i, err)
		}
	}
	// This is meant to mitigate connection drops
	db.SetConnMaxLifetime(time.Minute * 15)

	if err := migrateDatabase(db, cfg.DatabaseDriver, cfg.DatabaseURL); err != nil {
		log.Fatal("Failed to migrate database", err)
	}

	m := &Model{
		cfg: cfg,
		db:  db,
	}
	m.Recipes = &RecipeModel{Model: m}
	m.Tags = &TagModel{Model: m}
	m.Notes = &NoteModel{Model: m}
	m.Images = &RecipeImageModel{Model: m, upl: upl}
	m.Links = &RecipeLinkModel{Model: m}
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

func migrateDatabase(db *sqlx.DB, databaseDriver, databaseURL string) error {
	// Lock the database while we're migrating so that multiple instances
	// don't attempt to migrate simultaneously. This requires the same connection
	// to be used for both locking and unlocking.
	conn, err := db.Conn(context.Background())
	if err != nil {
		return err
	}
	defer conn.Close()
	// This should block until the lock has been acquired
	if err := lock(conn); err != nil {
		return err
	}
	defer unlock(conn)

	migrationPath := filepath.Join("db", "migrations", databaseDriver)

	if _, err := migrate.Version(databaseURL, migrationPath); err != nil {
		return err
	}

	allErrs, ok := migrate.UpSync(databaseURL, migrationPath)
	if !ok {
		errBuffer := new(bytes.Buffer)
		for _, err := range allErrs {
			errBuffer.WriteString(err.Error())
		}

		return errors.New(errBuffer.String())
	}

	_, err = migrate.Version(databaseURL, migrationPath)
	return err
}

func lock(conn *sql.Conn) error {
	stmt := `SELECT pg_advisory_lock(1)`
	_, err := conn.ExecContext(context.Background(), stmt)
	return err
}

func unlock(conn *sql.Conn) error {
	stmt := `SELECT pg_advisory_unlock(1)`
	_, err := conn.ExecContext(context.Background(), stmt)
	return err
}

func containsString(arr []string, str string) bool {
	for _, a := range arr {
		if a == str {
			return true
		}
	}
	return false
}
