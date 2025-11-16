package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"math/rand"
	"reflect"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"go.uber.org/mock/gomock"
)

type simpleSQLRecipeDriverAdapter struct{}

func (simpleSQLRecipeDriverAdapter) GetSearchFields(filterFields []models.SearchField, query string) (string, []any) {
	stmt := ""
	args := make([]any, 0)
	for _, field := range filterFields {
		stmt += fmt.Sprintf("%s = ? ", field)
		args = append(args, query)
	}

	return stmt, args
}

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
				SourceURL:           "My URL",
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
				SourceURL:           "My URL",
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
				SourceURL:           "My URL",
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
				SourceURL:           "My URL",
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
			expectedID := rand.Int63()

			dbmock.ExpectBegin()
			query := dbmock.ExpectQuery("INSERT INTO recipe \\(name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url, recipe_time\\) VALUES \\(\\$1, \\$2, \\$3, \\$4, \\$5, \\$6, \\$7\\, \\$8\\) RETURNING id").
				WithArgs(test.recipe.Name, test.recipe.ServingSize, test.recipe.NutritionInfo, test.recipe.Ingredients, test.recipe.Directions, test.recipe.StorageInstructions, test.recipe.SourceURL, test.recipe.Time)
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedID))
				for _, tag := range test.recipe.Tags {
					dbmock.ExpectExec("INSERT INTO recipe_tag \\(recipe_id, tag\\) VALUES \\(\\$1, \\$2\\)").WithArgs(expectedID, tag).
						WillReturnResult(driver.RowsAffected(1))
				}
				dbmock.ExpectCommit()
			} else {
				query.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().Create(t.Context(), &test.recipe)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *test.recipe.ID != expectedID {
				t.Errorf("expected id %d, received %d", expectedID, *test.recipe.ID)
			}
		})
	}
}

func Test_Recipe_Read(t *testing.T) {
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT id, name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url, recipe_time, current_state, created_at, modified_at FROM recipe WHERE id = \\$1").
				WithArgs(test.recipeID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "name", "serving_size", "nutrition_info", "ingredients", "directions", "storage_instructions", "source_url", "recipe_time", "current_state", "created_at", "modified_at"}).
					AddRow(test.recipeID, "My Recipe", "My Serving Size", "My Nutrition Info", "My Ingredients", "My Directions", "My Storage Instructions", "My URL", "My Time", models.Active, time.Now(), time.Now())
				query.WillReturnRows(rows)
				dbmock.ExpectQuery("SELECT tag FROM recipe_tag WHERE recipe_id = \\$1").WithArgs(test.recipeID).WillReturnRows(&sqlmock.Rows{})
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			recipe, err := sut.Recipes().Read(t.Context(), test.recipeID)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *recipe.ID != test.recipeID {
				t.Errorf("ids don't match, expected: %d, received: %d", test.recipeID, *recipe.ID)
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
				ID:                  utils.GetPtr[int64](1),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My URL",
				Time:                "My Time",
			}, nil, nil,
		},
		{
			models.Recipe{
				ID:                  utils.GetPtr[int64](1),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My URL",
				Time:                "My Time",
				Tags:                []string{"A", "B"},
			}, nil, nil,
		},
		{
			models.Recipe{
				ID:                  utils.GetPtr[int64](2),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My URL",
				Time:                "My Time",
			}, sql.ErrNoRows, ErrNotFound,
		},
		{
			models.Recipe{
				ID:                  utils.GetPtr[int64](3),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My URL",
				Time:                "My Time",
			}, sql.ErrConnDone, sql.ErrConnDone,
		},
		{
			models.Recipe{
				ID:                  nil,
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My URL",
				Time:                "My Time",
			}, nil, ErrMissingID,
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
					WithArgs(test.recipe.Name, test.recipe.ServingSize, test.recipe.NutritionInfo, test.recipe.Ingredients, test.recipe.Directions, test.recipe.StorageInstructions, test.recipe.SourceURL, test.recipe.Time, test.recipe.ID)
				if test.dbError == nil {
					exec.WillReturnResult(driver.RowsAffected(1))
					dbmock.ExpectExec("DELETE FROM recipe_tag WHERE recipe_id = \\$1").WithArgs(test.recipe.ID).WillReturnResult(driver.RowsAffected(0))
					for _, tag := range test.recipe.Tags {
						dbmock.ExpectExec("INSERT INTO recipe_tag \\(recipe_id, tag\\) VALUES \\(\\$1, \\$2\\)").WithArgs(test.recipe.ID, tag).
							WillReturnResult(driver.RowsAffected(1))
					}
					dbmock.ExpectCommit()
				} else {
					exec.WillReturnError(test.dbError)
					dbmock.ExpectRollback()
				}
			}

			// Act
			err := sut.Recipes().Update(t.Context(), &test.recipe)

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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe WHERE id = \\$1").WithArgs(test.recipeID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().Delete(t.Context(), test.recipeID)

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
		recipeID       int64
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
				WithArgs(test.recipeID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"avg_rating"}).AddRow(test.expectedRating)
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			rating, err := sut.Recipes().GetRating(t.Context(), test.recipeID)

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
		recipeID         int64
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
				updateExec = dbmock.ExpectExec("UPDATE recipe_rating SET rating = \\$1 WHERE recipe_id = \\$2").WithArgs(test.expectedRating, test.recipeID)
			} else {
				ratingSelect.WillReturnRows(&sqlmock.Rows{})
				updateExec = dbmock.ExpectExec("INSERT INTO recipe_rating \\(recipe_id, rating\\) VALUES \\(\\$1, \\$2\\)").WithArgs(test.recipeID, test.expectedRating)
			}
			if test.dbError == nil {
				updateExec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				updateExec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().SetRating(t.Context(), test.recipeID, test.expectedRating)

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
		recipeID      int64
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
				WithArgs(test.expectedState, test.recipeID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().SetState(t.Context(), test.recipeID, test.expectedState)

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
		recipeID      int64
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
				WithArgs(test.recipeID, test.tag)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Recipes().CreateTag(t.Context(), test.recipeID, test.tag)

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

			sut, dbmock := getMockDb(t)
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
			err := sut.Recipes().DeleteAllTags(t.Context(), test.recipeID)

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
		recipeID       int64
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
			result, err := sut.Recipes().ListTags(t.Context(), test.recipeID)

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

func Test_Recipe_ListAllTags(t *testing.T) {
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

			sut, dbmock := getMockDb(t)
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
			result, err := sut.Recipes().ListAllTags(t.Context())

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

func Test_getFieldsStmt(t *testing.T) {
	type args struct {
		query   string
		fields  []models.SearchField
		adapter sqlRecipeDriverAdapter
	}
	tests := []struct {
		name     string
		args     args
		wantStmt string
		wantArgs []any
	}{
		{
			name: "Empty",
			args: args{
				query:   "",
				fields:  []models.SearchField{},
				adapter: new(simpleSQLRecipeDriverAdapter),
			},
			wantStmt: "",
			wantArgs: nil,
		},
		{
			name: "Name",
			args: args{
				query:   "foo",
				fields:  []models.SearchField{models.SearchFieldName},
				adapter: new(simpleSQLRecipeDriverAdapter),
			},
			wantStmt: "name = ? ",
			wantArgs: []any{"foo"},
		},
		{
			name: "Directions",
			args: args{
				query:   "foo",
				fields:  []models.SearchField{models.SearchFieldDirections},
				adapter: new(simpleSQLRecipeDriverAdapter),
			},
			wantStmt: "directions = ? ",
			wantArgs: []any{"foo"},
		},
		{
			name: "Ingredients",
			args: args{
				query:   "foo",
				fields:  []models.SearchField{models.SearchFieldIngredients},
				adapter: new(simpleSQLRecipeDriverAdapter),
			},
			wantStmt: "ingredients = ? ",
			wantArgs: []any{"foo"},
		},
		{
			name: "Nutrition",
			args: args{
				query:   "foo",
				fields:  []models.SearchField{models.SearchFieldNutrition},
				adapter: new(simpleSQLRecipeDriverAdapter),
			},
			wantStmt: "nutrition_info = ? ",
			wantArgs: []any{"foo"},
		},
		{
			name: "Storage Instructions",
			args: args{
				query:   "foo",
				fields:  []models.SearchField{models.SearchFieldStorageInstructions},
				adapter: new(simpleSQLRecipeDriverAdapter),
			},
			wantStmt: "storage_instructions = ? ",
			wantArgs: []any{"foo"},
		},
		{
			name: "Mutliple Fields",
			args: args{
				query:   "foo",
				fields:  []models.SearchField{models.SearchFieldName, models.SearchFieldDirections, models.SearchFieldIngredients},
				adapter: new(simpleSQLRecipeDriverAdapter),
			},
			wantStmt: "name = ? directions = ? ingredients = ? ",
			wantArgs: []any{"foo", "foo", "foo"},
		},
		{
			name: "Default",
			args: args{
				query:   "foo",
				fields:  []models.SearchField{},
				adapter: new(simpleSQLRecipeDriverAdapter),
			},
			wantStmt: "name = ? ingredients = ? directions = ? storage_instructions = ? nutrition_info = ? ",
			wantArgs: []any{"foo", "foo", "foo", "foo", "foo"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotStmt, gotArgs := getFieldsStmt(tt.args.query, tt.args.fields, tt.args.adapter)
			if gotStmt != tt.wantStmt {
				t.Errorf("getFieldsStmt() gotStmt = %v, wantStmt %v", gotStmt, tt.wantStmt)
			}
			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("getFieldsStmt() gotArgs = %v, wantArgs %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func Test_getTagsStmt(t *testing.T) {
	type args struct {
		tags []string
	}
	tests := []struct {
		name     string
		args     args
		wantStmt string
		wantArgs []any
	}{
		{
			name: "Empty",
			args: args{
				tags: []string{},
			},
			wantStmt: "",
			wantArgs: nil,
		},
		{
			name: "Non-empty",
			args: args{
				tags: []string{"foo", "bar"},
			},
			wantStmt: "EXISTS (SELECT 1 FROM recipe_tag AS t WHERE t.recipe_id = r.id AND t.tag IN (?, ?))",
			wantArgs: []any{"foo", "bar"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotStmt, gotArgs, err := getTagsStmt(tt.args.tags)
			if err != nil {
				t.Error(err)
			}
			if gotStmt != tt.wantStmt {
				t.Errorf("getTagsStmt() gotStmt = %v, wantStmt %v", gotStmt, tt.wantStmt)
			}
			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("getTagsStmt() gotArgs = %v, wantArgs %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func Test_getPicturesStmt(t *testing.T) {
	type args struct {
		withPictures *bool
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "None",
			args: args{
				withPictures: nil,
			},
			want: "",
		},
		{
			name: "Yes",
			args: args{
				withPictures: utils.GetPtr[bool](true),
			},
			want: "EXISTS (SELECT 1 FROM recipe_image AS t WHERE t.recipe_id = r.id)",
		},
		{
			name: "No",
			args: args{
				withPictures: utils.GetPtr[bool](false),
			},
			want: "NOT EXISTS (SELECT 1 FROM recipe_image AS t WHERE t.recipe_id = r.id)",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getPicturesStmt(tt.args.withPictures)
			if got != tt.want {
				t.Errorf("getPicturesStmt() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_getOrderStmt(t *testing.T) {
	type args struct {
		sortBy  models.SortBy
		sortDir models.SortDir
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "ID, ASC",
			args: args{
				sortBy:  models.SortByID,
				sortDir: models.Asc,
			},
			want: "ORDER BY r.id",
		},
		{
			name: "ID, DESC",
			args: args{
				sortBy:  models.SortByID,
				sortDir: models.Desc,
			},
			want: "ORDER BY r.id DESC",
		},
		{
			name: "Name, ASC",
			args: args{
				sortBy:  models.SortByName,
				sortDir: models.Asc,
			},
			want: "ORDER BY r.name",
		},
		{
			name: "Name, DESC",
			args: args{
				sortBy:  models.SortByName,
				sortDir: models.Desc,
			},
			want: "ORDER BY r.name DESC",
		},
		{
			name: "Created, ASC",
			args: args{
				sortBy:  models.SortByCreated,
				sortDir: models.Asc,
			},
			want: "ORDER BY r.created_at",
		},
		{
			name: "Created, DESC",
			args: args{
				sortBy:  models.SortByCreated,
				sortDir: models.Desc,
			},
			want: "ORDER BY r.created_at DESC",
		},
		{
			name: "Modified, ASC",
			args: args{
				sortBy:  models.SortByModified,
				sortDir: models.Asc,
			},
			want: "ORDER BY r.modified_at",
		},
		{
			name: "Modified, DESC",
			args: args{
				sortBy:  models.SortByModified,
				sortDir: models.Desc,
			},
			want: "ORDER BY r.modified_at DESC",
		},
		{
			name: "Rating, ASC",
			args: args{
				sortBy:  models.SortByRating,
				sortDir: models.Asc,
			},
			want: "ORDER BY avg_rating, r.modified_at DESC",
		},
		{
			name: "Rating, DESC",
			args: args{
				sortBy:  models.SortByRating,
				sortDir: models.Desc,
			},
			want: "ORDER BY avg_rating DESC, r.modified_at DESC",
		},
		{
			name: "Random, ASC",
			args: args{
				sortBy:  models.SortByRandom,
				sortDir: models.Asc,
			},
			want: "ORDER BY RANDOM()",
		},
		{
			name: "Random, DESC",
			args: args{
				sortBy:  models.SortByRandom,
				sortDir: models.Desc,
			},
			want: "ORDER BY RANDOM() DESC",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getOrderStmt(tt.args.sortBy, tt.args.sortDir); got != tt.want {
				t.Errorf("getOrderStmt() = %v, want %v", got, tt.want)
			}
		})
	}
}
func Test_sqlRecipeDriver_Find(t *testing.T) {
	type args struct {
		filter *models.SearchFilter
		page   int64
		count  int64
	}
	type testCase struct {
		name           string
		args           args
		setupMock      func(sqlmock.Sqlmock)
		expectedErr    error
		expectedResult *[]models.RecipeCompact
		expectedTotal  int64
	}

	tests := []testCase{
		{
			name: "Basic Find with no filters",
			args: args{
				filter: &models.SearchFilter{},
				page:   1,
				count:  2,
			},
			setupMock: func(dbmock sqlmock.Sqlmock) {
				// Count query
				dbmock.ExpectQuery("SELECT count\\(r\\.id\\) FROM recipe AS r WHERE r\\.current_state IS NOT NULL").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
				// Select query
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS avg_rating, COALESCE\\(i\\.thumbnail_url, ''\\) AS thumbnail_url FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id LEFT OUTER JOIN recipe_image as i ON r\\.image_id = i\\.id WHERE r\\.current_state IS NOT NULL ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs(2, 0).
					WillReturnRows(sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "avg_rating", "thumbnail_url"}).
						AddRow(1, "Recipe1", models.Active, time.Now(), time.Now(), 4.5, "url1").
						AddRow(2, "Recipe2", models.Active, time.Now(), time.Now(), 3.0, "url2"))
			},
			expectedErr: nil,
			expectedResult: &[]models.RecipeCompact{
				{ID: utils.GetPtr[int64](1), Name: "Recipe1", State: utils.GetPtr(models.Active), AverageRating: utils.GetPtr[float32](4.5), ThumbnailURL: utils.GetPtr("url1")},
				{ID: utils.GetPtr[int64](2), Name: "Recipe2", State: utils.GetPtr(models.Active), AverageRating: utils.GetPtr[float32](3.0), ThumbnailURL: utils.GetPtr("url2")},
			},
			expectedTotal: 2,
		},
		{
			name: "Find with states filter",
			args: args{
				filter: &models.SearchFilter{States: []models.RecipeState{models.Active, models.Archived}},
				page:   1,
				count:  1,
			},
			setupMock: func(dbmock sqlmock.Sqlmock) {
				// sqlx.In expands the IN clause
				dbmock.ExpectQuery("SELECT count\\(r\\.id\\) FROM recipe AS r WHERE r\\.current_state IN \\(\\?, \\?\\)").
					WithArgs(models.Active, models.Archived).
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS avg_rating, COALESCE\\(i\\.thumbnail_url, ''\\) AS thumbnail_url FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id LEFT OUTER JOIN recipe_image as i ON r\\.image_id = i\\.id WHERE r\\.current_state IN \\(\\?, \\?\\) ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs(models.Active, models.Archived, 1, 0).
					WillReturnRows(sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "avg_rating", "thumbnail_url"}).
						AddRow(3, "Recipe3", models.Archived, time.Now(), time.Now(), 2.0, "url3"))
			},
			expectedErr: nil,
			expectedResult: &[]models.RecipeCompact{
				{ID: utils.GetPtr[int64](3), Name: "Recipe3", State: utils.GetPtr(models.Archived), AverageRating: utils.GetPtr[float32](2.0), ThumbnailURL: utils.GetPtr("url3")},
			},
			expectedTotal: 1,
		},
		{
			name: "Find with tags filter",
			args: args{
				filter: &models.SearchFilter{Tags: []string{"tag1", "tag2"}},
				page:   1,
				count:  1,
			},
			setupMock: func(dbmock sqlmock.Sqlmock) {
				// sqlx.In expands the IN clause
				dbmock.ExpectQuery("SELECT count\\(r\\.id\\) FROM recipe AS r WHERE r\\.current_state IS NOT NULL AND \\(EXISTS \\(SELECT 1 FROM recipe_tag AS t WHERE t\\.recipe_id = r\\.id AND t.tag IN \\(\\?, \\?\\)\\)\\)").
					WithArgs("tag1", "tag2").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS avg_rating, COALESCE\\(i\\.thumbnail_url, ''\\) AS thumbnail_url FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id LEFT OUTER JOIN recipe_image as i ON r\\.image_id = i\\.id WHERE r\\.current_state IS NOT NULL AND \\(EXISTS \\(SELECT 1 FROM recipe_tag AS t WHERE t\\.recipe_id = r\\.id AND t\\.tag IN \\(\\?, \\?\\)\\)\\) ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs("tag1", "tag2", 1, 0).
					WillReturnRows(sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "avg_rating", "thumbnail_url"}).
						AddRow(4, "Recipe4", models.Active, time.Now(), time.Now(), 5.0, "url4"))
			},
			expectedErr: nil,
			expectedResult: &[]models.RecipeCompact{
				{ID: utils.GetPtr[int64](4), Name: "Recipe4", State: utils.GetPtr(models.Active), AverageRating: utils.GetPtr[float32](5.0), ThumbnailURL: utils.GetPtr("url4")},
			},
			expectedTotal: 1,
		},
		{
			name: "Find with withPictures true",
			args: args{
				filter: &models.SearchFilter{WithPictures: utils.GetPtr(true)},
				page:   1,
				count:  1,
			},
			setupMock: func(dbmock sqlmock.Sqlmock) {
				dbmock.ExpectQuery("SELECT count\\(r\\.id\\) FROM recipe AS r WHERE r\\.current_state IS NOT NULL AND \\(EXISTS \\(SELECT 1 FROM recipe_image AS t WHERE t\\.recipe_id = r\\.id\\)\\)").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS avg_rating, COALESCE\\(i\\.thumbnail_url, ''\\) AS thumbnail_url FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id LEFT OUTER JOIN recipe_image as i ON r\\.image_id = i\\.id WHERE r\\.current_state IS NOT NULL AND \\(EXISTS \\(SELECT 1 FROM recipe_image AS t WHERE t\\.recipe_id = r\\.id\\)\\) ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs(1, 0).
					WillReturnRows(sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "avg_rating", "thumbnail_url"}).
						AddRow(5, "Recipe5", models.Active, time.Now(), time.Now(), 1.0, "url5"))
			},
			expectedErr: nil,
			expectedResult: &[]models.RecipeCompact{
				{ID: utils.GetPtr[int64](5), Name: "Recipe5", State: utils.GetPtr(models.Active), AverageRating: utils.GetPtr[float32](1.0), ThumbnailURL: utils.GetPtr("url5")},
			},
			expectedTotal: 1,
		},
		{
			name: "Find returns error on count",
			args: args{
				filter: &models.SearchFilter{},
				page:   1,
				count:  1,
			},
			setupMock: func(dbmock sqlmock.Sqlmock) {
				dbmock.ExpectQuery("SELECT count\\(r\\.id\\) FROM recipe AS r WHERE r\\.current_state IS NOT NULL").
					WillReturnError(sql.ErrConnDone)
			},
			expectedErr:    sql.ErrConnDone,
			expectedResult: nil,
			expectedTotal:  0,
		},
		{
			name: "Find returns error on select",
			args: args{
				filter: &models.SearchFilter{},
				page:   1,
				count:  1,
			},
			setupMock: func(dbmock sqlmock.Sqlmock) {
				dbmock.ExpectQuery("SELECT count\\(r\\.id\\) FROM recipe AS r WHERE r\\.current_state IS NOT NULL").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS avg_rating, COALESCE\\(i\\.thumbnail_url, ''\\) AS thumbnail_url FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id LEFT OUTER JOIN recipe_image as i ON r\\.image_id = i\\.id WHERE r\\.current_state IS NOT NULL ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs(1, 0).
					WillReturnError(sql.ErrConnDone)
			},
			expectedErr:    sql.ErrConnDone,
			expectedResult: nil,
			expectedTotal:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			sut, dbmock := getMockDb(t)
			defer sut.Close()
			if tt.setupMock != nil {
				tt.setupMock(dbmock)
			}
			got, total, err := sut.Recipes().Find(t.Context(), tt.args.filter, tt.args.page, tt.args.count)
			if !errors.Is(err, tt.expectedErr) {
				t.Errorf("expected error: %v, got: %v", tt.expectedErr, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("unfulfilled expectations: %v", err)
			}
			if tt.expectedResult != nil && got != nil {
				if len(*got) != len(*tt.expectedResult) {
					t.Errorf("expected %d results, got %d", len(*tt.expectedResult), len(*got))
				}
				for i := range *tt.expectedResult {
					gotItem := (*got)[i]
					wantItem := (*tt.expectedResult)[i]
					if (gotItem.ID == nil && wantItem.ID != nil) || (gotItem.ID != nil && wantItem.ID == nil) || (gotItem.ID != nil && wantItem.ID != nil && *gotItem.ID != *wantItem.ID) {
						t.Errorf("result at index %d: ID mismatch: got %v, want %v", i, gotItem.ID, wantItem.ID)
					}
					if gotItem.Name != wantItem.Name {
						t.Errorf("result at index %d: Name mismatch: got %v, want %v", i, gotItem.Name, wantItem.Name)
					}
					if (gotItem.State == nil && wantItem.State != nil) || (gotItem.State != nil && wantItem.State == nil) || (gotItem.State != nil && wantItem.State != nil && *gotItem.State != *wantItem.State) {
						t.Errorf("result at index %d: State mismatch: got %v, want %v", i, gotItem.State, wantItem.State)
					}
					if (gotItem.AverageRating == nil && wantItem.AverageRating != nil) || (gotItem.AverageRating != nil && wantItem.AverageRating == nil) || (gotItem.AverageRating != nil && wantItem.AverageRating != nil && *gotItem.AverageRating != *wantItem.AverageRating) {
						t.Errorf("result at index %d: AverageRating mismatch: got %v, want %v", i, gotItem.AverageRating, wantItem.AverageRating)
					}
					if (gotItem.ThumbnailURL == nil && wantItem.ThumbnailURL != nil) || (gotItem.ThumbnailURL != nil && wantItem.ThumbnailURL == nil) || (gotItem.ThumbnailURL != nil && wantItem.ThumbnailURL != nil && *gotItem.ThumbnailURL != *wantItem.ThumbnailURL) {
						t.Errorf("result at index %d: ThumbnailURL mismatch: got %v, want %v", i, gotItem.ThumbnailURL, wantItem.ThumbnailURL)
					}
				}
			}
			if total != tt.expectedTotal {
				t.Errorf("expected total %d, got %d", tt.expectedTotal, total)
			}
			if tt.expectedResult == nil && got != nil {
				t.Errorf("expected nil result, got %v", got)
			}
		})
	}
}
