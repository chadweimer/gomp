package db

import (
	"fmt"
	"strings"
	"testing"

	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
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
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			sut := sqliteDriverAdapter{}

			// Act
			stmt, args := sut.GetSearchFields(test.fields, test.query)

			// Assert
			expectedFields := lo.Intersect(test.fields, supportedSearchFields[:])
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

func Test_sqlite_GetSearchOrder(t *testing.T) {
	sut := sqliteDriverAdapter{}

	// When query is non-empty, order by bm25
	stmt, args := sut.GetSearchOrder([]models.SearchField{models.SearchFieldName}, "cookie", models.Desc)
	expectedStmt := "ORDER BY (SELECT bm25(recipe_fts, 5.0, 1.0, 1.0, 1.0, 1.0) FROM recipe_fts WHERE recipe_fts.rowid = r.id AND recipe_fts MATCH ?) ASC, r.modified_at DESC"
	if stmt != expectedStmt {
		t.Errorf("expected %q, got %q", expectedStmt, stmt)
	}
	if len(args) != 1 || args[0] != "{name} : cookie*" {
		t.Errorf("unexpected args: %v", args)
	}

	// When sortDir is Asc
	stmtAsc, _ := sut.GetSearchOrder([]models.SearchField{models.SearchFieldName}, "cookie", models.Asc)
	expectedStmtAsc := "ORDER BY (SELECT bm25(recipe_fts, 5.0, 1.0, 1.0, 1.0, 1.0) FROM recipe_fts WHERE recipe_fts.rowid = r.id AND recipe_fts MATCH ?) DESC, r.modified_at DESC"
	if stmtAsc != expectedStmtAsc {
		t.Errorf("expected %q, got %q", expectedStmtAsc, stmtAsc)
	}

	// When query is empty, fallback to modified_at
	stmtEmpty, argsEmpty := sut.GetSearchOrder([]models.SearchField{models.SearchFieldName}, "", models.Desc)
	if stmtEmpty != "ORDER BY r.modified_at DESC" || len(argsEmpty) != 0 {
		t.Errorf("unexpected empty query result: stmt=%q, args=%v", stmtEmpty, argsEmpty)
	}
}
