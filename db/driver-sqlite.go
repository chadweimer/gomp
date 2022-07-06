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

type sqliteRecipeDriverAdapter struct{}

func (sqliteRecipeDriverAdapter) GetSearchFields(filterFields []models.SearchField, query string) (string, []any) {
	fieldStr := ""
	fieldArgs := make([]interface{}, 0)
	for _, field := range supportedSearchFields {
		if containsField(filterFields, field) {
			if fieldStr != "" {
				fieldStr += " OR "
			}
			fieldStr += "r." + string(field) + " LIKE ?"
			fieldArgs = append(fieldArgs, "%"+query+"%")
		}
	}

	return fieldStr, fieldArgs
}

func openSQLite(connectionString string, migrationsTableName string, migrationsForceVersion int) (Driver, error) {
	// Attempt to create the base path, if necessary
	fileUrl, err := url.Parse(connectionString)
	if err != nil {
		return nil, err
	}
	if fileUrl.Scheme == "file" {
		fullPath, err := filepath.Abs(fileUrl.RequestURI())
		if err != nil {
			return nil, err
		}

		dir := filepath.Dir(fullPath)
		if err = os.MkdirAll(dir, 0750); err != nil {
			return nil, err
		}
	}

	db, err := sqlx.Connect(SQLiteDriverName, connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: '%w'", err)
	}
	// This is meant to mitigate connection drops
	db.SetConnMaxLifetime(time.Minute * 15)

	if err := migrateSqliteDatabase(db, migrationsTableName, migrationsForceVersion); err != nil {
		return nil, fmt.Errorf("failed to migrate database: '%w'", err)
	}

	drv := newSqlDriver(db, sqliteRecipeDriverAdapter{})
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
