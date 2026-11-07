package db

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/jmoiron/sqlx"

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

func (sqliteDriverAdapter) GetSearchFields(filterFields []models.SearchField, query string) (string, []any) {
	stmt, arg := buildSQLiteFTSQuery(filterFields, query)
	if stmt == "" {
		return "", make([]any, 0)
	}
	return stmt, []any{arg}
}

func (sqliteDriverAdapter) GetSearchOrder(filterFields []models.SearchField, query string, sortDir models.SortDir) (string, []any) {
	_, arg := buildSQLiteFTSQuery(filterFields, query)
	if arg == "" {
		return "ORDER BY r.modified_at DESC", nil
	}
	ftsOrder := "ASC"
	if sortDir == models.Asc {
		ftsOrder = "DESC"
	}
	stmt := fmt.Sprintf("ORDER BY (SELECT bm25(recipe_fts, 5.0, 1.0, 1.0, 1.0, 1.0) FROM recipe_fts WHERE recipe_fts.rowid = r.id AND recipe_fts MATCH ?) %s, r.modified_at DESC", ftsOrder)
	return stmt, []any{arg}
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
	if err := sqlx.SelectContext(ctx, db, &tables, "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'recipe_fts%'"); err != nil {
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
