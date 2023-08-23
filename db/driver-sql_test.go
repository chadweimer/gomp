package db

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

func getMockDb(t *testing.T) (*sqlDriver, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}

	dbx := sqlx.NewDb(db, "sqlmock")
	return newSqlDriver(dbx, mockRecipeDriverAdapter{}), mock
}

type mockRecipeDriverAdapter struct{}

func (mockRecipeDriverAdapter) GetSearchFields(_ []models.SearchField, _ string) (string, []any) {
	return "", make([]any, 0)
}
