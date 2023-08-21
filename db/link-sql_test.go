package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	gomock "github.com/golang/mock/gomock"
)

func Test_Link_Create(t *testing.T) {
	type testArgs struct {
		srcId         int64
		dstId         int64
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 2, nil, nil},
		{0, 0, sql.ErrNoRows, ErrNotFound},
		{0, 0, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlLinkDriver{db}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("INSERT INTO recipe_link \\(recipe_id, dest_recipe_id\\) VALUES \\(\\$1, \\$2\\)").WithArgs(test.srcId, test.dstId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Create(test.srcId, test.dstId)

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

func Test_Link_Delete(t *testing.T) {
	type testArgs struct {
		srcId         int64
		dstId         int64
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 2, nil, nil},
		{0, 0, sql.ErrNoRows, ErrNotFound},
		{0, 0, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlLinkDriver{db}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe_link WHERE \\(recipe_id = \\$1 AND dest_recipe_id = \\$2\\) OR \\(recipe_id = \\$2 AND dest_recipe_id = \\$1\\)").WithArgs(test.srcId, test.dstId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Delete(test.srcId, test.dstId)

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

func Test_Link_List(t *testing.T) {
	type testArgs struct {
		recipeId       int64
		expectedResult []models.RecipeCompact
		dbError        error
		expectedError  error
	}

	// Arrange
	now := time.Now()
	tests := []testArgs{
		{1, []models.RecipeCompact{
			{
				Id:            utils.GetPtr[int64](1),
				Name:          "My Linked Recipe",
				State:         utils.GetPtr(models.Active),
				CreatedAt:     &now,
				ModifiedAt:    &now,
				AverageRating: utils.GetPtr[float32](2.5),
				ThumbnailUrl:  nil,
			},
			{
				Id:            utils.GetPtr[int64](2),
				Name:          "My Other Linked Recipe",
				State:         utils.GetPtr(models.Archived),
				CreatedAt:     &now,
				ModifiedAt:    &now,
				AverageRating: utils.GetPtr[float32](4),
				ThumbnailUrl:  nil,
			},
		}, nil, nil},
		{0, nil, sql.ErrNoRows, ErrNotFound},
		{0, nil, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlLinkDriver{db}

			query := dbmock.ExpectQuery("SELECT .*id, .*name, .*current_state, .*created_at, .*modified_at, .*avg_rating, .*thumbnail_url .* ORDER BY .*name ASC").WithArgs(test.recipeId)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "avg_rating", "thumbnail_url"})
				for _, recipe := range test.expectedResult {
					rows.AddRow(recipe.Id, recipe.Name, recipe.State, recipe.CreatedAt, recipe.ModifiedAt, recipe.AverageRating, recipe.ThumbnailUrl)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			result, err := sut.List(test.recipeId)

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
					for i, recipe := range test.expectedResult {
						if recipe.Name != (*result)[i].Name {
							t.Errorf("names don't match, expected: %s, received: %s", recipe.Name, (*result)[i].Name)
						}
					}
				}
			}
		})
	}
}
