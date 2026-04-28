package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
	"go.uber.org/mock/gomock"
)

func Test_Tag_List(t *testing.T) {
	type testArgs struct {
		expectedResult map[string]int
		dbError        error
		expectedError  error
	}

	// Arrange
	tests := []testArgs{
		{map[string]int{"tag1": 2, "tag2": 3}, nil, nil},
		{nil, sql.ErrNoRows, ErrNotFound},
		{nil, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT tag, count\\(tag\\) as num FROM recipe_tag GROUP BY tag")
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"tag", "count"})
				for tag, count := range test.expectedResult {
					rows.AddRow(tag, count)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			result, err := sut.Tags().List(t.Context())

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
				} else if !reflect.DeepEqual(*result, test.expectedResult) {
					t.Errorf("got = %v, want %v", result, test.expectedResult)
				}
			}
		})
	}
}

func Test_createTagsForRecipe(t *testing.T) {
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
