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
			sut := sqliteRecipeDriverAdapter{}

			// Act
			stmt, args := sut.GetSearchFields(test.fields, test.query)

			// Assert
			expectedFields := lo.Intersect(test.fields, supportedSearchFields[:])
			if len(args) != len(expectedFields) {
				t.Errorf("expected %d args, received %d", len(expectedFields), len(args))
			}
			for index, arg := range args {
				strArg, ok := arg.(string)
				if !ok {
					t.Errorf("invalid argument type: %v", arg)
				}
				if strArg != "%"+test.query+"%" {
					t.Errorf("arg at index %d, expected %v, received %v", index, test.query, arg)
				}
			}
			if stmt == "" {
				if len(expectedFields) > 0 {
					t.Error("filter should not be empty")
				}
			} else {
				segments := strings.Split(stmt, " OR ")
				if len(segments) != len(expectedFields) {
					t.Errorf("expected %d segments, received %d", len(expectedFields), len(segments))
				}
			}
		})
	}
}
