package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
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
				Time:                "My Time",
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
				Time:                "My Time",
				Tags:                []string{"A", "B"},
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
				Time:                "My Time",
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
				Time:                "My Time",
			}, sql.ErrConnDone, sql.ErrConnDone,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()
			expectedId := rand.Int63()

			dbmock.ExpectBegin()
			query := dbmock.ExpectQuery("INSERT INTO recipe \\(name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url, recipe_time\\) VALUES \\(\\$1, \\$2, \\$3, \\$4, \\$5, \\$6, \\$7\\, \\$8\\) RETURNING id").
				WithArgs(test.recipe.Name, test.recipe.ServingSize, test.recipe.NutritionInfo, test.recipe.Ingredients, test.recipe.Directions, test.recipe.StorageInstructions, test.recipe.SourceUrl, test.recipe.Time)
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedId))
				for _, tag := range test.recipe.Tags {
					dbmock.ExpectExec("INSERT INTO recipe_tag \\(recipe_id, tag\\) VALUES \\(\\$1, \\$2\\)").WithArgs(expectedId, tag).
						WillReturnResult(driver.RowsAffected(1))
				}
				dbmock.ExpectCommit()
			} else {
				query.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().Create(&test.recipe)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
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

func Test_Recipe_Read(t *testing.T) {
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT id, name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url, recipe_time, current_state, created_at, modified_at FROM recipe WHERE id = \\$1").
				WithArgs(test.recipeId)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "name", "serving_size", "nutrition_info", "ingredients", "directions", "storage_instructions", "source_url", "recipe_time", "current_state", "created_at", "modified_at"}).
					AddRow(test.recipeId, "My Recipe", "My Serving Size", "My Nutrition Info", "My Ingredients", "My Directions", "My Storage Instructions", "My Url", "My Time", models.Active, time.Now(), time.Now())
				query.WillReturnRows(rows)
				dbmock.ExpectQuery("SELECT tag FROM recipe_tag WHERE recipe_id = \\$1").WithArgs(test.recipeId).WillReturnRows(&sqlmock.Rows{})
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			recipe, err := sut.Recipes().Read(test.recipeId)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *recipe.Id != test.recipeId {
				t.Errorf("ids don't match, expected: %d, received: %d", test.recipeId, *recipe.Id)
			}
		})
	}
}

func Test_Recipe_Update(t *testing.T) {
	type testArgs struct {
		recipe        models.Recipe
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{
			models.Recipe{
				Id:                  utils.GetPtr[int64](1),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceUrl:           "My Url",
				Time:                "My Time",
			}, nil, nil,
		},
		{
			models.Recipe{
				Id:                  utils.GetPtr[int64](1),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceUrl:           "My Url",
				Time:                "My Time",
				Tags:                []string{"A", "B"},
			}, nil, nil,
		},
		{
			models.Recipe{
				Id:                  utils.GetPtr[int64](2),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceUrl:           "My Url",
				Time:                "My Time",
			}, sql.ErrNoRows, ErrNotFound,
		},
		{
			models.Recipe{
				Id:                  utils.GetPtr[int64](3),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceUrl:           "My Url",
				Time:                "My Time",
			}, sql.ErrConnDone, sql.ErrConnDone,
		},
		{
			models.Recipe{
				Id:                  nil,
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceUrl:           "My Url",
				Time:                "My Time",
			}, nil, ErrMissingId,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			if test.expectedError != nil && test.dbError == nil {
				dbmock.ExpectRollback()
			} else {
				exec := dbmock.ExpectExec("UPDATE recipe SET name = \\$1, serving_size = \\$2, nutrition_info = \\$3, ingredients = \\$4, directions = \\$5, storage_instructions = \\$6, source_url = \\$7, recipe_time = \\$8 WHERE id = \\$9").
					WithArgs(test.recipe.Name, test.recipe.ServingSize, test.recipe.NutritionInfo, test.recipe.Ingredients, test.recipe.Directions, test.recipe.StorageInstructions, test.recipe.SourceUrl, test.recipe.Time, test.recipe.Id)
				if test.dbError == nil {
					exec.WillReturnResult(driver.RowsAffected(1))
					dbmock.ExpectExec("DELETE FROM recipe_tag WHERE recipe_id = \\$1").WithArgs(test.recipe.Id).WillReturnResult(driver.RowsAffected(0))
					for _, tag := range test.recipe.Tags {
						dbmock.ExpectExec("INSERT INTO recipe_tag \\(recipe_id, tag\\) VALUES \\(\\$1, \\$2\\)").WithArgs(test.recipe.Id, tag).
							WillReturnResult(driver.RowsAffected(1))
					}
					dbmock.ExpectCommit()
				} else {
					exec.WillReturnError(test.dbError)
					dbmock.ExpectRollback()
				}
			}

			// Act
			err := sut.Recipes().Update(&test.recipe)

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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

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
			err := sut.Recipes().Delete(test.recipeId)

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

func Test_Recipe_GetRating(t *testing.T) {
	type testArgs struct {
		recipeId       int64
		expectedRating float32
		dbError        error
		expectedError  error
	}

	// Arrange
	tests := []testArgs{
		{1, 2.5, nil, nil},
		{0, 0, sql.ErrNoRows, ErrNotFound},
		{0, 0, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT COALESCE\\(g\\.rating, 0\\) AS avg_rating FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id WHERE r\\.id = \\$1").
				WithArgs(test.recipeId)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"avg_rating"}).AddRow(test.expectedRating)
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			rating, err := sut.Recipes().GetRating(test.recipeId)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *rating != test.expectedRating {
				t.Errorf("ratings don't match, expected: %f, received: %f", test.expectedRating, *rating)
			}
		})
	}
}

func Test_Recipe_SetRating(t *testing.T) {
	type testArgs struct {
		recipeId         int64
		hasCurrentRating bool
		expectedRating   float32
		dbError          error
		expectedError    error
	}

	// Arrange
	tests := []testArgs{
		{1, false, 3.5, nil, nil},
		{1, true, 3.5, nil, nil},
		{0, false, 0, sql.ErrNoRows, ErrNotFound},
		{0, true, 0, sql.ErrNoRows, ErrNotFound},
		{0, false, 0, sql.ErrConnDone, sql.ErrConnDone},
		{0, true, 0, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			ratingSelect := dbmock.ExpectQuery("SELECT count\\(\\*\\) FROM recipe_rating WHERE recipe_id = \\$1")
			var updateExec *sqlmock.ExpectedExec
			if test.hasCurrentRating {
				ratingSelect.WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
				updateExec = dbmock.ExpectExec("UPDATE recipe_rating SET rating = \\$1 WHERE recipe_id = \\$2").WithArgs(test.expectedRating, test.recipeId)
			} else {
				ratingSelect.WillReturnRows(&sqlmock.Rows{})
				updateExec = dbmock.ExpectExec("INSERT INTO recipe_rating \\(recipe_id, rating\\) VALUES \\(\\$1, \\$2\\)").WithArgs(test.recipeId, test.expectedRating)
			}
			if test.dbError == nil {
				updateExec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				updateExec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().SetRating(test.recipeId, test.expectedRating)

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

func Test_Recipe_SetState(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		expectedState models.RecipeState
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, models.Active, nil, nil},
		{1, models.Archived, nil, nil},
		{0, models.Active, sql.ErrNoRows, ErrNotFound},
		{0, models.Active, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE recipe SET current_state = \\$1 WHERE id = \\$2").
				WithArgs(test.expectedState, test.recipeId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().SetState(test.recipeId, test.expectedState)

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

func Test_Recipe_CreateTag(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		tag           string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "A", nil, nil},
		{1, "A", sql.ErrNoRows, ErrNotFound},
		{1, "A", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("INSERT INTO recipe_tag \\(recipe_id, tag\\) VALUES \\(\\$1, \\$2\\)").
				WithArgs(test.recipeId, test.tag)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().CreateTag(test.recipeId, test.tag)

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

func Test_Recipe_DeleteAllTags(t *testing.T) {
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe_tag WHERE recipe_id = \\$1").WithArgs(test.recipeId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().DeleteAllTags(test.recipeId)

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

func Test_Recipe_ListTags(t *testing.T) {
	type testArgs struct {
		recipeId       int64
		expectedResult []string
		dbError        error
		expectedError  error
	}

	// Arrange
	tests := []testArgs{
		{1, []string{"A", "B"}, nil, nil},
		{0, nil, sql.ErrNoRows, ErrNotFound},
		{0, nil, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT tag FROM recipe_tag WHERE recipe_id = \\$1").WithArgs(test.recipeId)
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
			result, err := sut.Recipes().ListTags(test.recipeId)

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
