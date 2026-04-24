package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"path/filepath"
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

type postgresDriverAdapter struct{}

func (postgresDriverAdapter) GetSearchFields(filterFields []models.SearchField, query string) (string, []any) {
	fieldStr := ""
	fieldArgs := make([]any, 0)

	for _, field := range lo.Intersect(filterFields, supportedSearchFields[:]) {
		if fieldStr != "" {
			fieldStr += " OR "
		}
		fieldStr += fmt.Sprintf("to_tsvector('english', r.%s) @@ websearch_to_wildcard_tsquery('english', ?)", field)
		fieldArgs = append(fieldArgs, query)
	}

	return fieldStr, fieldArgs
}

func (postgresDriverAdapter) DeferConstraints(ctx context.Context, db sqlx.ExecerContext) error {
	if _, err := db.ExecContext(ctx, "SET CONSTRAINTS ALL DEFERRED"); err != nil {
		return fmt.Errorf("deferring constraints: %w", err)
	}
	return nil
}

func (postgresDriverAdapter) GetTableNames(ctx context.Context, db sqlx.QueryerContext) ([]string, error) {
	tables := make([]string, 0)
	if err := sqlx.SelectContext(ctx, db, &tables, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"); err != nil {
		return nil, err
	}

	return tables, nil
}

func (postgresDriverAdapter) SanitizeExport(_ context.Context, backup *models.BackupData) {
	for _, table := range *backup {
		for _, row := range table.Data {
			for key, value := range row {
				if byteValue, ok := value.([]byte); ok {
					// Postgres can return []byte for enum fields, which isn't JSON serializable. Convert those to strings.
					// In a general purpose implementation, we'd want to check the column type to make sure we're only converting enum fields,
					// but since we don't otherwise store binary data, we can get away with just converting any []byte we encounter.
					row[key] = string(byteValue)
				} else {
					row[key] = value
				}
			}
		}
	}
}

func (postgresDriverAdapter) SanitizeImport(_ context.Context, backup *models.BackupData) {
	// Nothing to do for Postgres; it can handle all the types we throw at it without any special handling during import
}

func openPostgres(connectionURL url.URL, migrationsTableName string, migrationsForceVersion int) (Driver, error) {
	// In docker, on first bring up, the DB takes a little while.
	// Let's try a few times to establish connection before giving up.
	const maxAttempts = 20
	var db *sqlx.DB
	var err error
	for i := 1; i <= maxAttempts; i++ {
		db, err = sqlx.Connect(PostgresDriverName, connectionURL.String())
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

	drv := newSQLDriver(db, postgresDriverAdapter{})
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
			panic(fmt.Errorf("Failed to unlock database: %w", unlockErr))
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
