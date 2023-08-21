package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"math/rand"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	gomock "github.com/golang/mock/gomock"
)

func Test_Recipe_Create(t *testing.T) {
	type testArgs struct {
		recipe        models.Recipe
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{
			models.Recipe{
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceUrl:           "My Url",
			}, nil, nil,
		},
		{
			models.Recipe{
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceUrl:           "My Url",
			}, sql.ErrNoRows, ErrNotFound,
		},
		{
			models.Recipe{
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceUrl:           "My Url",
			}, sql.ErrConnDone, sql.ErrConnDone,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlRecipeDriver{db, mockRecipeDriverAdapter{}}
			expectedId := rand.Int63()

			dbmock.ExpectBegin()
			query := dbmock.ExpectQuery("INSERT INTO recipe \\(name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url\\) VALUES \\(\\$1, \\$2, \\$3, \\$4, \\$5, \\$6, \\$7\\) RETURNING id").
				WithArgs(test.recipe.Name, test.recipe.ServingSize, test.recipe.NutritionInfo, test.recipe.Ingredients, test.recipe.Directions, test.recipe.StorageInstructions, test.recipe.SourceUrl)
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedId))
				dbmock.ExpectCommit()
			} else {
				query.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Create(&test.recipe)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *test.recipe.Id != expectedId {
				t.Errorf("expected id %d, received %d", expectedId, *test.recipe.Id)
			}
		})
	}
}

func Test_Recipe_Delete(t *testing.T) {
	type testArgs struct {
		recipeId      int64
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

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlRecipeDriver{db, mockRecipeDriverAdapter{}}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe WHERE id = \\$1").WithArgs(test.recipeId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Delete(test.recipeId)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
		})
	}
}

type mockRecipeDriverAdapter struct{}

func (mockRecipeDriverAdapter) GetSearchFields(_ []models.SearchField, _ string) (string, []any) {
	return "", make([]any, 0)
}
