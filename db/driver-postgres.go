package db

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/url"
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

type postgresDriverAdapter struct{}
type postgresDriver struct {
	*sqlDriver
}

func getPostgresSearchVector(fields []models.SearchField) string {
	tsvectors := lo.FilterMap(fields, func(field models.SearchField, _ int) (string, bool) {
		switch field {
		case models.SearchFieldName:
			return "setweight(to_tsvector('english', coalesce(r.name, '')), 'A')", true
		case models.SearchFieldIngredients:
			return "setweight(to_tsvector('english', coalesce(r.ingredients, '')), 'B')", true
		case models.SearchFieldDirections:
			return "setweight(to_tsvector('english', coalesce(r.directions, '')), 'C')", true
		case models.SearchFieldStorageInstructions:
			return "setweight(to_tsvector('english', coalesce(r.storage_instructions, '')), 'D')", true
		case models.SearchFieldNutrition:
			return "setweight(to_tsvector('english', coalesce(r.nutrition_info, '')), 'D')", true
		default:
			return "", false
		}
	})
	if len(tsvectors) == 1 {
		return tsvectors[0]
	}
	return "(" + strings.Join(tsvectors, " || ") + ")"
}

func (postgresDriverAdapter) GetSearchFields(filterFields []models.SearchField, query string) (string, []any) {
	fields := normalizeSearchFields(filterFields)
	if len(fields) == 0 || strings.TrimSpace(query) == "" {
		return "", make([]any, 0)
	}

	vector := getPostgresSearchVector(fields)
	stmt := fmt.Sprintf("%s @@ websearch_to_wildcard_tsquery('english', ?)", vector)
	return stmt, []any{query}
}

// GetRelevanceSearchOrder returns the PostgreSQL-specific ts_rank ORDER BY clause when sorting by relevance.
func (postgresDriverAdapter) GetRelevanceSearchOrder(filterFields []models.SearchField, query string, sortDir models.SortDir) (string, []any) {
	fields := normalizeSearchFields(filterFields)
	if len(fields) == 0 || strings.TrimSpace(query) == "" {
		return fmt.Sprintf("ORDER BY r.modified_at %s", lo.Ternary(sortDir == models.Asc, "ASC", "DESC")), nil
	}

	vector := getPostgresSearchVector(fields)
	rankOrder := lo.Ternary(sortDir == models.Asc, "ASC", "DESC")
	stmt := fmt.Sprintf("ORDER BY ts_rank(%s, websearch_to_wildcard_tsquery('english', ?)) %s, r.modified_at DESC", vector, rankOrder)
	return stmt, []any{query}
}

func (postgresDriverAdapter) PostExport(_ context.Context, _ sqlx.ExecerContext, backup *models.BackupData) error {
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

	return nil
}

func (postgresDriverAdapter) PreImport(ctx context.Context, db sqlx.ExecerContext, _ *models.BackupData) error {
	if _, err := db.ExecContext(ctx, "SET CONSTRAINTS ALL DEFERRED"); err != nil {
		return fmt.Errorf("deferring constraints: %w", err)
	}
	// Disable triggers during the import
	if _, err := db.ExecContext(ctx, "SET LOCAL session_replication_role = replica"); err != nil {
		return fmt.Errorf("disabling triggers: %w", err)
	}
	return nil
}

func (postgresDriverAdapter) GetImportInsertStatement() string {
	return "INSERT"
}

func (postgresDriverAdapter) PostImport(ctx context.Context, db sqlx.ExecerContext, backup *models.BackupData) error {
	// We need to special-case PostgreSQL because of it having sequences that need to be reset after import
	for _, table := range *backup {
		tableName := table.TableName

		if len(table.Data) > 0 {
			// Get column names from the first row
			for columnName := range table.Data[0] {
				// This uses a stored procedure that already handles treating the string names safely for SQL execution.
				_, err := db.ExecContext(ctx, fmt.Sprintf("SELECT sync_seq('%s', '%s')", tableName, columnName))
				if err != nil {
					slog.ErrorContext(ctx, "failed to sync sequence for column", "table", tableName, "column", columnName, "error", err)
					return fmt.Errorf("syncing sequence for table %s column %s: %w", tableName, columnName, err)
				}
			}
		}
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

func openPostgres(connectionURL url.URL) (Driver, error) {
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

	drv := newSQLDriver(db, postgresDriverAdapter{}, postgres.DefaultMigrationsTable)
	return &postgresDriver{drv}, nil
}

func (drv *postgresDriver) MigrateUp() error {
	return migratePostgresDatabase(drv.Db, func(m *migrate.Migrate) error {
		return m.Up()
	})
}

func (drv *postgresDriver) MigrateDown() error {
	return migratePostgresDatabase(drv.Db, func(m *migrate.Migrate) error {
		return m.Down()
	})
}

func (drv *postgresDriver) MigrateSteps(steps int) error {
	return migratePostgresDatabase(drv.Db, func(m *migrate.Migrate) error {
		return m.Steps(steps)
	})
}

func migratePostgresDatabase(db *sqlx.DB, op func(m *migrate.Migrate) error) error {
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

	driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
	if err != nil {
		return err
	}

	return migrateDatabase(driver, PostgresDriverName, op)
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
