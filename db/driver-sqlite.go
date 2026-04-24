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
	"github.com/samber/lo"

	// sqlite database driver
	_ "modernc.org/sqlite"

	// File source for db migration
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// SQLiteDriverName is the name to use for this driver
const SQLiteDriverName string = "sqlite"

type sqliteDriverAdapter struct{}

func (sqliteDriverAdapter) GetSearchFields(filterFields []models.SearchField, query string) (string, []any) {
	fieldStr := ""
	fieldArgs := make([]any, 0)
	for _, field := range supportedSearchFields {
		if lo.Contains(filterFields, field) {
			if fieldStr != "" {
				fieldStr += " OR "
			}
			fieldStr += "r." + string(field) + " LIKE ?"
			fieldArgs = append(fieldArgs, "%"+query+"%")
		}
	}

	return fieldStr, fieldArgs
}

func (sqliteDriverAdapter) PreImport(ctx context.Context, db sqlx.ExecerContext) error {
	if _, err := db.ExecContext(ctx, "PRAGMA defer_foreign_keys = on"); err != nil {
		return fmt.Errorf("deferring constraints: %w", err)
	}
	return nil
}

func (sqliteDriverAdapter) GetImportInsertStatement() string {
	return "INSERT OR REPLACE"
}

func (sqliteDriverAdapter) PostImport(_ context.Context, _ sqlx.ExecerContext) error {
	return nil
}

func (sqliteDriverAdapter) GetTableNames(ctx context.Context, db sqlx.QueryerContext) ([]string, error) {
	tables := make([]string, 0)
	if err := sqlx.SelectContext(ctx, db, &tables, "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'"); err != nil {
		return nil, err
	}

	return tables, nil
}

func (sqliteDriverAdapter) StandardizeExport(_ context.Context, _ *models.BackupData) {
	// Nothing to do for SQLite; it does not have any special types that need to be handled during export
}

func openSQLite(connectionURL url.URL, migrationsTableName string, migrationsForceVersion int) (Driver, error) {
	// Attempt to create the base path, if necessary
	if connectionURL.Scheme == "file" {
		fullPath, err := filepath.Abs(connectionURL.RequestURI())
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

	// If the migrations table name was not specificed, use the default from the migrate library
	if migrationsTableName == "" {
		migrationsTableName = sqlite.DefaultMigrationsTable
	}

	if err := migrateSqliteDatabase(db, migrationsTableName, migrationsForceVersion); err != nil {
		return nil, fmt.Errorf("failed to migrate database: '%w'", err)
	}

	drv := newSQLDriver(db, sqliteDriverAdapter{}, migrationsTableName)
	return drv, nil
}

func migrateSqliteDatabase(db *sqlx.DB, migrationsTableName string, migrationsForceVersion int) error {
	conn, err := db.Conn(context.Background())
	if err != nil {
		return err
	}
	defer conn.Close()

	driver, err := sqlite.WithInstance(db.DB, &sqlite.Config{
		MigrationsTable: migrationsTableName,
		NoTxWrap:        true,
	})
	if err != nil {
		return err
	}

	migrationPath := "file://" + filepath.Join("db", "migrations", SQLiteDriverName)
	m, err := migrate.NewWithDatabaseInstance(
		migrationPath,
		SQLiteDriverName,
		driver)
	if err != nil {
		return err
	}

	if migrationsForceVersion > 0 {
		err = m.Force(migrationsForceVersion)
	} else {
		err = m.Up()
	}
	if err != nil && err != migrate.ErrNoChange {
		return err
	}

	return nil
}
