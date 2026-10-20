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

func Test_fillTagsForRecipes(t *testing.T) {
	t.Run("empty recipes slice", func(t *testing.T) {
		sut, dbmock := getMockDb(t, nil)
		defer sut.Close()

		err := fillTagsForRecipes[*models.Recipe](t.Context(), sut.Db)
		if err != nil {
			t.Errorf("expected nil error, got: %v", err)
		}
		if err := dbmock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %s", err)
		}
	})

	t.Run("recipes with nil IDs", func(t *testing.T) {
		sut, dbmock := getMockDb(t, nil)
		defer sut.Close()

		recipe := &models.Recipe{}
		err := fillTagsForRecipes(t.Context(), sut.Db, recipe)
		if err != nil {
			t.Errorf("expected nil error, got: %v", err)
		}
		if recipe.Tags == nil || len(recipe.Tags) != 0 {
			t.Errorf("expected empty tags slice, got: %v", recipe.Tags)
		}
		if err := dbmock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %s", err)
		}
	})

	t.Run("single Recipe with tags", func(t *testing.T) {
		sut, dbmock := getMockDb(t, nil)
		defer sut.Close()

		recipe := &models.Recipe{ID: new(int64(1))}
		rows := sqlmock.NewRows([]string{"recipe_id", "tag"}).
			AddRow(1, "chicken").
			AddRow(1, "dinner")
		dbmock.ExpectQuery("SELECT recipe_id, tag FROM recipe_tag WHERE recipe_id IN \\(\\?\\) ORDER BY recipe_id, tag ASC").
			WithArgs(int64(1)).
			WillReturnRows(rows)

		err := fillTagsForRecipes(t.Context(), sut.Db, recipe)
		if err != nil {
			t.Errorf("expected nil error, got: %v", err)
		}
		if len(recipe.Tags) != 2 || recipe.Tags[0] != "chicken" || recipe.Tags[1] != "dinner" {
			t.Errorf("unexpected tags: %v", recipe.Tags)
		}
		if err := dbmock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %s", err)
		}
	})

	t.Run("single Recipe without tags", func(t *testing.T) {
		sut, dbmock := getMockDb(t, nil)
		defer sut.Close()

		recipe := &models.Recipe{ID: new(int64(1))}
		rows := sqlmock.NewRows([]string{"recipe_id", "tag"})
		dbmock.ExpectQuery("SELECT recipe_id, tag FROM recipe_tag WHERE recipe_id IN \\(\\?\\) ORDER BY recipe_id, tag ASC").
			WithArgs(int64(1)).
			WillReturnRows(rows)

		err := fillTagsForRecipes(t.Context(), sut.Db, recipe)
		if err != nil {
			t.Errorf("expected nil error, got: %v", err)
		}
		if recipe.Tags == nil || len(recipe.Tags) != 0 {
			t.Errorf("expected empty tags slice, got: %v", recipe.Tags)
		}
		if err := dbmock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %s", err)
		}
	})

	t.Run("multiple RecipeCompact mixed tags", func(t *testing.T) {
		sut, dbmock := getMockDb(t, nil)
		defer sut.Close()

		r1 := &models.RecipeCompact{ID: new(int64(1))}
		r2 := &models.RecipeCompact{ID: new(int64(2))}
		rows := sqlmock.NewRows([]string{"recipe_id", "tag"}).
			AddRow(1, "tag1").
			AddRow(1, "tag2")
		dbmock.ExpectQuery("SELECT recipe_id, tag FROM recipe_tag WHERE recipe_id IN \\(\\?, \\?\\) ORDER BY recipe_id, tag ASC").
			WithArgs(int64(1), int64(2)).
			WillReturnRows(rows)

		err := fillTagsForRecipes(t.Context(), sut.Db, r1, r2)
		if err != nil {
			t.Errorf("expected nil error, got: %v", err)
		}
		if len(r1.Tags) != 2 || r1.Tags[0] != "tag1" || r1.Tags[1] != "tag2" {
			t.Errorf("unexpected r1 tags: %v", r1.Tags)
		}
		if len(r2.Tags) != 0 {
			t.Errorf("expected empty r2 tags, got: %v", r2.Tags)
		}
		if err := dbmock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %s", err)
		}
	})

	t.Run("db error", func(t *testing.T) {
		sut, dbmock := getMockDb(t, nil)
		defer sut.Close()

		recipe := &models.Recipe{ID: new(int64(1))}
		dbmock.ExpectQuery("SELECT recipe_id, tag FROM recipe_tag WHERE recipe_id IN \\(\\?\\) ORDER BY recipe_id, tag ASC").
			WithArgs(int64(1)).
			WillReturnError(sql.ErrConnDone)

		err := fillTagsForRecipes(t.Context(), sut.Db, recipe)
		if !errors.Is(err, sql.ErrConnDone) {
			t.Errorf("expected sql.ErrConnDone, got: %v", err)
		}
		if err := dbmock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %s", err)
		}
	})
}

