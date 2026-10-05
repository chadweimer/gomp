package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
	"go.uber.org/mock/gomock"
)

func Test_Tag_List(t *testing.T) {
	type testArgs struct {
		sortBy         models.TagSortBy
		sortDir        models.SortDir
		page           int64
		count          int64
		expectedTotal  int64
		expectedResult []models.Tag
		countDbError   error
		selectDbError  error
		expectedError  error
	}

	// Arrange
	tests := []testArgs{
		{
			sortBy:         models.TagSortByTag,
			sortDir:        models.Asc,
			page:           1,
			count:          10,
			expectedTotal:  2,
			expectedResult: []models.Tag{{Tag: "tag1", Count: 2}, {Tag: "tag2", Count: 3}},
		},
		{
			sortBy:         models.TagSortByCount,
			sortDir:        models.Desc,
			page:           2,
			count:          5,
			expectedTotal:  12,
			expectedResult: []models.Tag{{Tag: "popular", Count: 10}},
		},
		{
			sortBy:        models.TagSortByTag,
			sortDir:       models.Asc,
			page:          1,
			count:         10,
			countDbError:  sql.ErrConnDone,
			expectedError: sql.ErrConnDone,
		},
		{
			sortBy:        models.TagSortByTag,
			sortDir:       models.Asc,
			page:          1,
			count:         10,
			selectDbError: sql.ErrConnDone,
			expectedError: sql.ErrConnDone,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			countQuery := dbmock.ExpectQuery("SELECT count\\(DISTINCT tag\\) FROM recipe_tag")
			if test.countDbError != nil {
				countQuery.WillReturnError(test.countDbError)
			} else {
				countRows := sqlmock.NewRows([]string{"count"}).AddRow(test.expectedTotal)
				countQuery.WillReturnRows(countRows)

				selectQuery := dbmock.ExpectQuery("SELECT tag, count\\(tag\\) AS count FROM recipe_tag GROUP BY tag")
				if test.count >= 0 {
					selectQuery.WithArgs(test.count, test.count*(test.page-1))
				}
				if test.selectDbError != nil {
					selectQuery.WillReturnError(test.selectDbError)
				} else {
					rows := sqlmock.NewRows([]string{"tag", "count"})
					for _, tag := range test.expectedResult {
						rows.AddRow(tag.Tag, tag.Count)
					}
					selectQuery.WillReturnRows(rows)
				}
			}

			// Act
			result, total, err := sut.Tags().List(t.Context(), test.sortBy, test.sortDir, test.page, test.count)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil {
				if total != test.expectedTotal {
					t.Errorf("expected total: %d, received: %d", test.expectedTotal, total)
				}
				if result == nil {
					t.Errorf("expected results %v, but did not receive any", test.expectedResult)
				} else if !reflect.DeepEqual(*result, test.expectedResult) {
					t.Errorf("got = %v, want %v", *result, test.expectedResult)
				}
			}
		})
	}
}

func Test_getTagOrderStmt(t *testing.T) {
	tests := []struct {
		sortBy   models.TagSortBy
		sortDir  models.SortDir
		expected string
	}{
		{models.TagSortByTag, models.Asc, "ORDER BY tag ASC"},
		{models.TagSortByTag, models.Desc, "ORDER BY tag DESC"},
		{models.TagSortByCount, models.Asc, "ORDER BY count(tag) ASC, tag ASC"},
		{models.TagSortByCount, models.Desc, "ORDER BY count(tag) DESC, tag ASC"},
	}
	for _, test := range tests {
		t.Run(fmt.Sprintf("%s_%s", test.sortBy, test.sortDir), func(t *testing.T) {
			got := getTagOrderStmt(test.sortBy, test.sortDir)
			if got != test.expected {
				t.Errorf("expected %q, got %q", test.expected, got)
			}
		})
	}
}

func Test_createTagForRecipe(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		tag           string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "weeknight", nil, nil},
		{1, "weeknight", sql.ErrNoRows, ErrNotFound},
		{1, "weeknight", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("INSERT INTO recipe_tag \\(recipe_id, tag\\) VALUES \\(\\$1, \\$2\\)").
				WithArgs(test.recipeID, test.tag)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := tx(t.Context(), sut.Db, func(db *sqlx.Tx) error {
				return createTagForRecipe(t.Context(), test.recipeID, test.tag, db)
			})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
		})
	}
}

func Test_deleteAllTagsFromRecipe(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, nil, nil},
		{0, sql.ErrNoRows, ErrNotFound},
		{0, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe_tag WHERE recipe_id = \\$1").WithArgs(test.recipeID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := tx(t.Context(), sut.Db, func(db *sqlx.Tx) error {
				return deleteAllTagsFromRecipe(t.Context(), test.recipeID, db)
			})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
		})
	}
}

func Test_listTagsForRecipe(t *testing.T) {
	type testArgs struct {
		recipeID       int64
		expectedResult []string
		dbError        error
		expectedError  error
	}

	// Arrange
	tests := []testArgs{
		{1, []string{"weeknight", "high-protein"}, nil, nil},
		{0, nil, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT tag FROM recipe_tag WHERE recipe_id = \\$1").WithArgs(test.recipeID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"tag"})
				for _, tag := range test.expectedResult {
					rows.AddRow(tag)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			result, err := listTagsForRecipe(t.Context(), test.recipeID, sut.Db)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedResult == nil {
				if result != nil {
					t.Errorf("did not expect results, but received %v", result)
				}
			} else {
				if result == nil {
					t.Errorf("expected results %v, but did not receive any", test.expectedResult)
				} else if len(test.expectedResult) != len(*result) {
					t.Errorf("expected %d results, received %d results", len(test.expectedResult), len(*result))
				} else {
					for i, tag := range test.expectedResult {
						if tag != (*result)[i] {
							t.Errorf("tags don't match, expected: %s, received: %s", tag, (*result)[i])
						}
					}
				}
			}
		})
	}
}
