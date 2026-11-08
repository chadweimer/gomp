package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
	"go.uber.org/mock/gomock"
)

func Test_sqlite_GetSearchFields(t *testing.T) {
	type testArgs struct {
		fields []models.SearchField
		query  string
	}

	// Arrange
	tests := []testArgs{
		{[]models.SearchField{models.SearchFieldName}, "query"},
		{[]models.SearchField{models.SearchFieldName, models.SearchFieldDirections}, "query"},
		{supportedSearchFields[:], "query"},
		{[]models.SearchField{models.SearchFieldName, "invalid"}, "query"},
		{[]models.SearchField{"invalid"}, "query"},
		{[]models.SearchField{}, "query"},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			sut := sqliteDriverAdapter{}

			// Act
			stmt, args := sut.GetSearchFields(test.fields, test.query)

			// Assert
			expectedFields := normalizeSearchFields(test.fields)
			if len(expectedFields) == 0 {
				if stmt != "" {
					t.Errorf("expected empty stmt, got %s", stmt)
				}
				if len(args) != 0 {
					t.Errorf("expected 0 args, got %d", len(args))
				}
			} else {
				if stmt != "r.id IN (SELECT rowid FROM recipe_fts WHERE recipe_fts MATCH ?)" {
					t.Errorf("unexpected stmt: %s", stmt)
				}
				if len(args) != 1 {
					t.Fatalf("expected 1 arg, got %d", len(args))
				}
				argStr, ok := args[0].(string)
				if !ok {
					t.Fatalf("arg is not string: %v", args[0])
				}
				colNames := make([]string, 0, len(expectedFields))
				for _, f := range expectedFields {
					colNames = append(colNames, string(f))
				}
				expectedPrefix := fmt.Sprintf("{%s} : ", strings.Join(colNames, " "))
				if !strings.HasPrefix(argStr, expectedPrefix) {
					t.Errorf("expected arg prefix %q, got %q", expectedPrefix, argStr)
				}
			}
		})
	}
}

func Test_sqlite_GetRelevanceSearchOrder(t *testing.T) {
	sut := sqliteDriverAdapter{}

	// When query is non-empty, order by bm25
	stmt, args := sut.GetRelevanceSearchOrder([]models.SearchField{models.SearchFieldName}, "cookie", models.Desc)
	expectedStmt := "ORDER BY (SELECT bm25(recipe_fts, 10.0, 4.0, 2.0, 1.0, 1.0) FROM recipe_fts WHERE recipe_fts.rowid = r.id AND recipe_fts MATCH ?) ASC, r.modified_at DESC"
	if stmt != expectedStmt {
		t.Errorf("expected %q, got %q", expectedStmt, stmt)
	}
	if len(args) != 1 || args[0] != `{name} : ("cookie"*)` {
		t.Errorf("unexpected args: %v", args)
	}

	// When sortDir is Asc
	stmtAsc, _ := sut.GetRelevanceSearchOrder([]models.SearchField{models.SearchFieldName}, "cookie", models.Asc)
	expectedStmtAsc := "ORDER BY (SELECT bm25(recipe_fts, 10.0, 4.0, 2.0, 1.0, 1.0) FROM recipe_fts WHERE recipe_fts.rowid = r.id AND recipe_fts MATCH ?) DESC, r.modified_at DESC"
	if stmtAsc != expectedStmtAsc {
		t.Errorf("expected %q, got %q", expectedStmtAsc, stmtAsc)
	}

	// When query is pure negation, fallback to modified_at
	stmtNeg, argsNeg := sut.GetRelevanceSearchOrder([]models.SearchField{models.SearchFieldName}, "-nuts", models.Desc)
	if stmtNeg != "ORDER BY r.modified_at DESC" || len(argsNeg) != 0 {
		t.Errorf("unexpected pure negation result: stmt=%q, args=%v", stmtNeg, argsNeg)
	}

	// When query is empty, fallback to modified_at respecting sortDir
	stmtEmptyDesc, argsEmptyDesc := sut.GetRelevanceSearchOrder([]models.SearchField{models.SearchFieldName}, "", models.Desc)
	if stmtEmptyDesc != "ORDER BY r.modified_at DESC" || len(argsEmptyDesc) != 0 {
		t.Errorf("unexpected empty query result (desc): stmt=%q, args=%v", stmtEmptyDesc, argsEmptyDesc)
	}
	stmtEmptyAsc, argsEmptyAsc := sut.GetRelevanceSearchOrder([]models.SearchField{models.SearchFieldName}, "", models.Asc)
	if stmtEmptyAsc != "ORDER BY r.modified_at ASC" || len(argsEmptyAsc) != 0 {
		t.Errorf("unexpected empty query result (asc): stmt=%q, args=%v", stmtEmptyAsc, argsEmptyAsc)
	}
}

func Test_sqlite_GetTableNames(t *testing.T) {
	tests := []struct {
		name           string
		dbError        error
		wantTableNames []string
		wantErr        error
	}{
		{
			name:           "success",
			dbError:        nil,
			wantTableNames: []string{"recipe", "app_configuration"},
			wantErr:        nil,
		},
		{
			name:           "error",
			dbError:        sql.ErrConnDone,
			wantTableNames: []string{},
			wantErr:        sql.ErrConnDone,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			dbDriver, dbmock := getMockDb(t, nil)
			defer dbDriver.Close()

			query := dbmock.ExpectQuery("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'recipe_fts%'")
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"name"})
				for _, tableName := range test.wantTableNames {
					rows.AddRow(tableName)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			sut := sqliteDriverAdapter{}
			got, err := sut.GetTableNames(t.Context(), dbDriver.Db)
			if !errors.Is(err, test.wantErr) {
				t.Errorf("expected error %v, received %v", test.wantErr, err)
			}
			missingWant, extraGot := lo.Difference(test.wantTableNames, got)
			if len(missingWant) > 0 || len(extraGot) > 0 {
				t.Errorf("unexpected table names: got %v, want %v", got, test.wantTableNames)
			}
		})
	}
}

func Test_sqlite_PostImport(t *testing.T) {
	tests := []struct {
		name    string
		dbError error
		wantErr error
	}{
		{
			name:    "rebuilds fts index",
			dbError: nil,
			wantErr: nil,
		},
		{
			name:    "db error",
			dbError: sql.ErrConnDone,
			wantErr: sql.ErrConnDone,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			dbDriver, dbMock := getMockDb(t, nil)
			defer dbDriver.Close()

			exec := dbMock.ExpectExec("INSERT INTO recipe_fts\\(recipe_fts\\) VALUES\\('rebuild'\\)")
			if test.dbError == nil {
				exec.WillReturnResult(driver.ResultNoRows)
			} else {
				exec.WillReturnError(test.dbError)
			}

			sut := sqliteDriverAdapter{}
			err := sut.PostImport(t.Context(), dbDriver.Db, &models.BackupData{})
			if !errors.Is(err, test.wantErr) {
				t.Errorf("expected error %v, received %v", test.wantErr, err)
			}
		})
	}
}
