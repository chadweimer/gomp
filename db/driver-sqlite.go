package db

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/chadweimer/fts5query"
	"github.com/chadweimer/gomp/models"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/jmoiron/sqlx"
	"github.com/samber/lo"

	// sqlite database driver
	_ "modernc.org/sqlite"

	// File source for db migration
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// SQLiteDriverName is the name to use for this driver
const SQLiteDriverName string = "sqlite"

type sqliteDriverAdapter struct{}
type sqliteDriver struct {
	*sqlDriver
}

func parseSQLiteFTSQuery(filterFields []models.SearchField, rawQuery string) *fts5query.Result {
	fields := normalizeSearchFields(filterFields)
	if len(fields) == 0 {
		return nil
	}
	cols := make([]string, 0, len(fields))
	for _, f := range fields {
		cols = append(cols, string(f))
	}
	return fts5query.Parse(rawQuery, fts5query.WithColumns(cols...))
}

func (sqliteDriverAdapter) GetSearchFilter(filterFields []models.SearchField, query string) (joinClause string, whereClause string, args []any) {
	res := parseSQLiteFTSQuery(filterFields, query)
	return res.SQLJoin("recipe_fts", "r.id")
}

// GetRelevanceSearchOrder returns the SQLite-specific BM25 ORDER BY clause when sorting by relevance.
func (sqliteDriverAdapter) GetRelevanceSearchOrder(filterFields []models.SearchField, query string, sortDir models.SortDir) (string, []any) {
	res := parseSQLiteFTSQuery(filterFields, query)
	if bm25 := res.BM25("recipe_fts", 10.0, 4.0, 2.0, 1.0, 1.0); bm25 != "" {
		// SQLite BM25 scores are lower for better matches (higher relevance), so we flip ASC/DESC here.
		ftsOrder := lo.Ternary(sortDir == models.Asc, "DESC", "ASC")
		return fmt.Sprintf("ORDER BY %s %s, r.modified_at DESC", bm25, ftsOrder), nil
	}
	return fmt.Sprintf("ORDER BY r.modified_at %s", lo.Ternary(sortDir == models.Asc, "ASC", "DESC")), nil
}

func (sqliteDriverAdapter) PreImport(ctx context.Context, db sqlx.ExecerContext, _ *models.BackupData) error {
	if _, err := db.ExecContext(ctx, "PRAGMA defer_foreign_keys = on"); err != nil {
		return fmt.Errorf("deferring constraints: %w", err)
	}
	return nil
}

func (sqliteDriverAdapter) GetImportInsertStatement() string {
	return "INSERT OR REPLACE"
}

func (sqliteDriverAdapter) PostImport(ctx context.Context, db sqlx.ExecerContext, _ *models.BackupData) error {
	if _, err := db.ExecContext(ctx, "INSERT INTO recipe_fts(recipe_fts) VALUES('rebuild')"); err != nil {
		return fmt.Errorf("rebuilding fts index: %w", err)
	}
	return nil
}

func (sqliteDriverAdapter) GetTableNames(ctx context.Context, db sqlx.QueryerContext) ([]string, error) {
	tables := make([]string, 0)
	query := "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' AND name != 'recipe_fts' AND name NOT LIKE 'recipe\\_fts\\_%' ESCAPE '\\'"
	if err := sqlx.SelectContext(ctx, db, &tables, query); err != nil {
		return nil, err
	}

	return tables, nil
}

func openSQLite(connectionURL url.URL) (Driver, error) {
	// Attempt to create the base path, if necessary
	if connectionURL.Scheme == "file" {
		fullPath, err := filepath.Abs(filepath.Clean(connectionURL.RequestURI()))
		if err != nil {
			return nil, err
		}

		dir := filepath.Dir(fullPath)
		if err = os.MkdirAll(dir, 0750); err != nil {
			return nil, err
		}
	}

	db, err := sqlx.Connect(SQLiteDriverName, connectionURL.String())
	if err != nil {
		return nil, fmt.Errorf("failed to open database: '%w'", err)
	}
	// This is meant to mitigate connection drops
	db.SetConnMaxLifetime(time.Minute * 15)

	drv := newSQLDriver(db, sqliteDriverAdapter{}, sqlite.DefaultMigrationsTable)
	return &sqliteDriver{drv}, nil
}

func (drv *sqliteDriver) MigrateUp() error {
	return migrateSqliteDatabase(drv.Db, func(m *migrate.Migrate) error {
		return m.Up()
	})
}

func (drv *sqliteDriver) MigrateDown() error {
	return migrateSqliteDatabase(drv.Db, func(m *migrate.Migrate) error {
		return m.Down()
	})
}

func (drv *sqliteDriver) MigrateSteps(steps int) error {
	return migrateSqliteDatabase(drv.Db, func(m *migrate.Migrate) error {
		return m.Steps(steps)
	})
}

func migrateSqliteDatabase(db *sqlx.DB, op func(m *migrate.Migrate) error) error {
	driver, err := sqlite.WithInstance(db.DB, &sqlite.Config{
		NoTxWrap: true,
	})
	if err != nil {
		return err
	}

	return migrateDatabase(driver, SQLiteDriverName, op)
}
