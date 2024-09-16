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
	"github.com/golang/mock/gomock"
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
			err := sut.Recipes().Create(&test.recipe)

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
			recipe, err := sut.Recipes().Read(test.recipeID)

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
			err := sut.Recipes().Delete(test.recipeID)

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
			rating, err := sut.Recipes().GetRating(test.recipeID)

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
			err := sut.Recipes().SetRating(test.recipeID, test.expectedRating)

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
			err := sut.Recipes().SetState(test.recipeID, test.expectedState)

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
			err := sut.Recipes().CreateTag(test.recipeID, test.tag)

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
			err := sut.Recipes().DeleteAllTags(test.recipeID)

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
			result, err := sut.Recipes().ListTags(test.recipeID)

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
			wantArgs: []any{},
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
			wantArgs: []any{},
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
				t.Errorf("getTagssStmt() gotStmt = %v, wantStmt %v", gotStmt, tt.wantStmt)
			}
			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("getTagssStmt() gotArgs = %v, wantArgs %v", gotArgs, tt.wantArgs)
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
