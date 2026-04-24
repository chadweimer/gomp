package db

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

func getMockDb(t *testing.T, adapter sqlDriverAdapter) (*sqlDriver, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}

	dbx := sqlx.NewDb(db, "sqlmock")
	if adapter == nil {
		adapter = mockDriverAdapter{}
	}
	return newSQLDriver(dbx, adapter), mock
}

type mockDriverAdapter struct {
	tableNames []string
}

func (mockDriverAdapter) GetSearchFields(_ []models.SearchField, _ string) (string, []any) {
	return "", make([]any, 0)
}

func (m mockDriverAdapter) GetTableNames(_ context.Context, _ sqlx.QueryerContext) ([]string, error) {
	return m.tableNames, nil
}

func (mockDriverAdapter) DeferConstraints(_ context.Context, _ sqlx.ExecerContext) error {
	return nil
}
