package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/jmoiron/sqlx"
	"github.com/samber/lo"

	// postgres database driver
	_ "github.com/lib/pq"

	// File source for db migration
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// PostgresDriverName is the name to use for this driver
const PostgresDriverName string = "postgres"

type postgresRecipeDriverAdapter struct{}

func (postgresRecipeDriverAdapter) GetSearchFields(filterFields []models.SearchField, query string) (string, []any) {
	fieldStr := ""
	fieldArgs := make([]any, 0)

	// Split each term in the query, and append :* to each term to allow for partial matches
	terms := strings.Join(lo.Map(strings.Fields(query), func(term string, _ int) string {
		if !strings.HasSuffix(term, ":*") {
			term += ":*"
		}
		// Remove any surrounding quotes
		return strings.Trim(term, `'"`)
	}), " & ")

	for _, field := range supportedSearchFields {
		if lo.Contains(filterFields, field) {
			// Standard full text search
			currStr := fmt.Sprintf("to_tsvector('english', r.%s) @@ plainto_tsquery('english', ?)", field)
			// Full text search with terms that allow for partial matches
			currStr += fmt.Sprintf(" OR to_tsvector('english', r.%s) @@ to_tsquery('english', ?)", field)

			// Add the current field string and arguments to the overall string and args
			if fieldStr != "" {
				fieldStr += " OR "
			}
			fieldStr += fmt.Sprintf("(%s)", currStr)
			fieldArgs = append(fieldArgs, query, terms)
		}
	}

	return fieldStr, fieldArgs
}

func openPostgres(connectionString string, migrationsTableName string, migrationsForceVersion int) (Driver, error) {
	// In docker, on first bring up, the DB takes a little while.
	// Let's try a few times to establish connection before giving up.
	const maxAttempts = 20
	var db *sqlx.DB
	var err error
	for i := 1; i <= maxAttempts; i++ {
		db, err = sqlx.Connect(PostgresDriverName, connectionString)
		if err == nil {
			break
		}

		if i == maxAttempts {
			return nil, fmt.Errorf("giving up after failing to open database on attempt %d: '%w'", i, err)
		}

		slog.Error("Failed to open database. Will try again...",
			"error", err,
			"attempt", i)
		time.Sleep(500 * time.Millisecond)
	}
	// This is meant to mitigate connection drops
	db.SetConnMaxLifetime(time.Minute * 15)

	if err := migratePostgresDatabase(db, migrationsTableName, migrationsForceVersion); err != nil {
		return nil, fmt.Errorf("failed to migrate database: '%w'", err)
	}

	drv := newSQLDriver(db, postgresRecipeDriverAdapter{})
	return drv, nil
}

func migratePostgresDatabase(db *sqlx.DB, migrationsTableName string, migrationsForceVersion int) error {
	// Lock the database while we're migrating so that multiple instances
	// don't attempt to migrate simultaneously. This requires the same connection
	// to be used for both locking and unlocking.
	conn, err := db.Conn(context.Background())
	if err != nil {
		return err
	}
	defer conn.Close()
	// This should block until the lock has been acquired
	if err := lockPostgres(conn); err != nil {
		return err
	}
	defer func() {
		if unlockErr := unlockPostgres(conn); unlockErr != nil {
			panic("Failed to unlock database")
		}
	}()

	driver, err := postgres.WithInstance(db.DB, &postgres.Config{
		MigrationsTable: migrationsTableName,
	})
	if err != nil {
		return err
	}

	migrationPath := "file://" + filepath.Join("db", "migrations", PostgresDriverName)
	m, err := migrate.NewWithDatabaseInstance(
		migrationPath,
		PostgresDriverName,
		driver)
	if err != nil {
		return err
	}

	if migrationsForceVersion > 0 {
		err = m.Force(migrationsForceVersion)
	} else {
		err = m.Up()
	}
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}

	return nil
}

func lockPostgres(conn *sql.Conn) error {
	stmt := "SELECT pg_advisory_lock(1)"
	_, err := conn.ExecContext(context.Background(), stmt)
	return err
}

func unlockPostgres(conn *sql.Conn) error {
	stmt := "SELECT pg_advisory_unlock(1)"
	_, err := conn.ExecContext(context.Background(), stmt)
	return err
}
