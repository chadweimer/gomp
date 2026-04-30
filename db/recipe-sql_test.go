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

func recipeFixtureLemonGarlicChicken() models.Recipe {
	return models.Recipe{
		Name:                "Lemon Garlic Chicken",
		State:               models.Active,
		Rating:              utils.GetPtr[float32](4.5),
		Ingredients:         "1.5 lb chicken thighs\n2 tbsp olive oil\n3 cloves garlic\n1 lemon",
		Directions:          "Marinate chicken, then roast at 400F until cooked through.",
		NutritionInfo:       "420 kcal per serving",
		ServingSize:         "4 servings",
		StorageInstructions: "Refrigerate in an airtight container for up to 3 days.",
		SourceURL:           "https://example.com/recipes/lemon-garlic-chicken",
		Time:                "45 minutes",
		Tags:                []string{"weeknight", "chicken", "high-protein"},
	}
}

func recipeFixtureSheetPanSausage() models.Recipe {
	return models.Recipe{
		Name:                "Sheet Pan Sausage and Peppers",
		State:               models.Active,
		Rating:              utils.GetPtr[float32](2.5),
		Ingredients:         "12 oz smoked sausage\n2 bell peppers\n1 red onion\n2 tbsp olive oil",
		Directions:          "Slice the vegetables and sausage, toss with oil, and roast until browned.",
		NutritionInfo:       "510 kcal per serving",
		ServingSize:         "4 servings",
		StorageInstructions: "Store refrigerated for up to 4 days and reheat in the oven.",
		SourceURL:           "https://example.com/recipes/sheet-pan-sausage-peppers",
		Time:                "35 minutes",
		Tags:                []string{"weeknight", "one-pan", "dinner"},
	}
}

func recipeFixtureChickpeaSaladWraps() models.Recipe {
	return models.Recipe{
		Name:                "Chickpea Salad Wraps",
		State:               models.Archived,
		Rating:              utils.GetPtr[float32](0),
		Ingredients:         "2 cans chickpeas\n3 tbsp mayo\n1 celery stalk\n4 tortillas",
		Directions:          "Mash the chickpeas, mix with the remaining ingredients, and roll into wraps.",
		NutritionInfo:       "390 kcal per serving",
		ServingSize:         "4 wraps",
		StorageInstructions: "Keep the filling chilled and assemble wraps just before serving.",
		SourceURL:           "https://example.com/recipes/chickpea-salad-wraps",
		Time:                "20 minutes",
		Tags:                []string{"vegetarian", "lunch", "make-ahead"},
	}
}

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
			recipeFixtureLemonGarlicChicken(), nil, nil,
		},
		{
			recipeFixtureSheetPanSausage(), nil, nil,
		},
		{
			recipeFixtureChickpeaSaladWraps(), sql.ErrNoRows, ErrNotFound,
		},
		{
			recipeFixtureSheetPanSausage(), sql.ErrConnDone, sql.ErrConnDone,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
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

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.serving_size, r\\.nutrition_info, r\\.ingredients, r\\.directions, r\\.storage_instructions, r\\.source_url, r\\.recipe_time, r\\.current_state, r\\.main_image_name, COALESCE\\(g\\.rating, 0\\) AS rating, r\\.created_at, r\\.modified_at FROM recipe as r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id WHERE r\\.id = \\$1").
				WithArgs(test.recipeID)
			if test.dbError == nil {
				fixture := recipeFixtureLemonGarlicChicken()
				rows := sqlmock.NewRows([]string{"id", "name", "serving_size", "nutrition_info", "ingredients", "directions", "storage_instructions", "source_url", "recipe_time", "current_state", "main_image_name", "rating", "created_at", "modified_at"}).
					AddRow(test.recipeID, fixture.Name, fixture.ServingSize, fixture.NutritionInfo, fixture.Ingredients, fixture.Directions, fixture.StorageInstructions, fixture.SourceURL, fixture.Time, models.Active, fixture.MainImageName, fixture.Rating, time.Now(), time.Now())
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
			func() models.Recipe {
				recipe := recipeFixtureLemonGarlicChicken()
				recipe.ID = utils.GetPtr[int64](1)
				return recipe
			}(), nil, nil,
		},
		{
			func() models.Recipe {
				recipe := recipeFixtureSheetPanSausage()
				recipe.ID = utils.GetPtr[int64](1)
				return recipe
			}(), nil, nil,
		},
		{
			func() models.Recipe {
				recipe := recipeFixtureChickpeaSaladWraps()
				recipe.ID = utils.GetPtr[int64](2)
				return recipe
			}(), sql.ErrNoRows, ErrNotFound,
		},
		{
			func() models.Recipe {
				recipe := recipeFixtureSheetPanSausage()
				recipe.ID = utils.GetPtr[int64](3)
				return recipe
			}(), sql.ErrConnDone, sql.ErrConnDone,
		},
		{
			func() models.Recipe { recipe := recipeFixtureChickpeaSaladWraps(); return recipe }(), nil, ErrMissingID,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			dbmock.ExpectBegin()
			if test.expectedError != nil && test.dbError == nil {
				dbmock.ExpectRollback()
			} else {
				exec := dbmock.ExpectExec("UPDATE recipe SET name = \\$1, serving_size = \\$2, nutrition_info = \\$3, ingredients = \\$4, directions = \\$5, storage_instructions = \\$6, source_url = \\$7, recipe_time = \\$8, main_image_name = \\$9 WHERE id = \\$10").
					WithArgs(test.recipe.Name, test.recipe.ServingSize, test.recipe.NutritionInfo, test.recipe.Ingredients, test.recipe.Directions, test.recipe.StorageInstructions, test.recipe.SourceURL, test.recipe.Time, test.recipe.MainImageName, test.recipe.ID)
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

func Test_Recipe_Patch(t *testing.T) {
	type testArgs struct {
		name             string
		recipeID         int64
		hasCurrentRating bool
		patch            models.RecipePatch
		expectedState    *models.RecipeState
		expectedImage    *string
		expectedRating   *float32
	}

	// Arrange
	tests := []testArgs{
		{
			name:             "Patch with rating only and no existing rating",
			recipeID:         1,
			hasCurrentRating: false,
			patch:            models.RecipePatch{Rating: utils.GetPtr[float32](3.5)},
			expectedRating:   utils.GetPtr[float32](3.5),
		},
		{
			name:             "Patch with rating only and existing rating",
			recipeID:         1,
			hasCurrentRating: true,
			patch:            models.RecipePatch{Rating: utils.GetPtr[float32](3.5)},
			expectedRating:   utils.GetPtr[float32](3.5),
		},
		{
			name:             "Patch with rating only with zero value and existing rating",
			recipeID:         0,
			hasCurrentRating: true,
			patch:            models.RecipePatch{Rating: utils.GetPtr[float32](0)},
			expectedRating:   utils.GetPtr[float32](0),
		},
		{
			name:             "Patch with all fields",
			recipeID:         1,
			hasCurrentRating: true,
			patch: models.RecipePatch{
				State:         utils.GetPtr(models.Archived),
				MainImageName: utils.GetPtr("new_image.jpg"),
				Rating:        utils.GetPtr[float32](4.0),
			},
			expectedState:  utils.GetPtr(models.Archived),
			expectedImage:  utils.GetPtr("new_image.jpg"),
			expectedRating: utils.GetPtr[float32](4.0),
		},
		{
			name:     "Patch with state and image",
			recipeID: 1,
			patch: models.RecipePatch{
				State:         utils.GetPtr(models.Archived),
				MainImageName: utils.GetPtr("new_image.jpg"),
			},
			expectedState: utils.GetPtr(models.Archived),
			expectedImage: utils.GetPtr("new_image.jpg"),
		},
		{
			name:     "Patch with state only",
			recipeID: 1,
			patch: models.RecipePatch{
				State: utils.GetPtr(models.Archived),
			},
			expectedState: utils.GetPtr(models.Archived),
		},
		{
			name:     "Patch with image only",
			recipeID: 1,
			patch: models.RecipePatch{
				MainImageName: utils.GetPtr("new_image.jpg"),
			},
			expectedImage: utils.GetPtr("new_image.jpg"),
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			dbmock.ExpectBegin()
			if test.expectedState != nil || test.expectedImage != nil {
				stmt := "UPDATE recipe SET "
				fields := ""
				args := make([]driver.Value, 0)
				if test.expectedState != nil {
					fields += "current_state = \\?"
					args = append(args, *test.expectedState)
				}
				if test.expectedImage != nil {
					if fields != "" {
						fields += ", "
					}
					fields += "main_image_name = \\?"
					args = append(args, *test.expectedImage)
				}
				stmt += fields + " WHERE id = \\?"
				args = append(args, test.recipeID)
				dbmock.ExpectExec(stmt).WithArgs(args...).
					WillReturnResult(driver.RowsAffected(1))
			}
			if test.expectedRating != nil {
				ratingSelect := dbmock.ExpectQuery("SELECT count\\(\\*\\) FROM recipe_rating WHERE recipe_id = \\$1")
				if test.hasCurrentRating {
					ratingSelect.WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
					dbmock.ExpectExec("UPDATE recipe_rating SET rating = \\$1 WHERE recipe_id = \\$2").
						WithArgs(*test.expectedRating, test.recipeID).
						WillReturnResult(driver.RowsAffected(1))
				} else {
					ratingSelect.WillReturnRows(&sqlmock.Rows{})
					dbmock.ExpectExec("INSERT INTO recipe_rating \\(recipe_id, rating\\) VALUES \\(\\$1, \\$2\\)").
						WithArgs(test.recipeID, *test.expectedRating).
						WillReturnResult(driver.RowsAffected(1))
				}
			}
			dbmock.ExpectCommit()

			// Act
			err := sut.Recipes().Patch(t.Context(), test.recipeID, &test.patch)

			// Assert
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
		})
	}
}

// func Test_Recipe_SetState(t *testing.T) {
// 	type testArgs struct {
// 		recipeID      int64
// 		expectedState models.RecipeState
// 		dbError       error
// 		expectedError error
// 	}

// 	// Arrange
// 	tests := []testArgs{
// 		{1, models.Active, nil, nil},
// 		{1, models.Archived, nil, nil},
// 		{0, models.Active, sql.ErrNoRows, ErrNotFound},
// 		{0, models.Active, sql.ErrConnDone, sql.ErrConnDone},
// 	}
// 	for i, test := range tests {
// 		t.Run(fmt.Sprint(i), func(t *testing.T) {
// 			// Arrange
// 			ctrl := gomock.NewController(t)
// 			defer ctrl.Finish()

// 			sut, dbmock := getMockDb(t, nil)
// 			defer sut.Close()

// 			dbmock.ExpectBegin()
// 			exec := dbmock.ExpectExec("UPDATE recipe SET current_state = \\$1 WHERE id = \\$2").
// 				WithArgs(test.expectedState, test.recipeID)
// 			if test.dbError == nil {
// 				exec.WillReturnResult(driver.RowsAffected(1))
// 				dbmock.ExpectCommit()
// 			} else {
// 				exec.WillReturnError(test.dbError)
// 				dbmock.ExpectRollback()
// 			}

// 			// Act
// 			err := sut.Recipes().SetState(t.Context(), test.recipeID, test.expectedState)

// 			// Assert
// 			if !errors.Is(err, test.expectedError) {
// 				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
// 			}
// 			if err := dbmock.ExpectationsWereMet(); err != nil {
// 				t.Errorf("there were unfulfilled expectations: %s", err)
// 			}
// 		})
// 	}
// }

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

			sut, dbmock := getMockDb(t, nil)
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
				withPictures: utils.GetPtr(true),
			},
			want: "r.main_image_name IS NOT NULL AND r.main_image_name != ''",
		},
		{
			name: "No",
			args: args{
				withPictures: utils.GetPtr(false),
			},
			want: "r.main_image_name IS NULL OR r.main_image_name = ''",
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
			want: "ORDER BY rating, r.modified_at DESC",
		},
		{
			name: "Rating, DESC",
			args: args{
				sortBy:  models.SortByRating,
				sortDir: models.Desc,
			},
			want: "ORDER BY rating DESC, r.modified_at DESC",
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
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS rating, r\\.main_image_name FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id WHERE r\\.current_state IS NOT NULL ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs(2, 0).
					WillReturnRows(sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "rating", "main_image_name"}).
						AddRow(1, "Recipe1", models.Active, time.Now(), time.Now(), 4.5, "url1").
						AddRow(2, "Recipe2", models.Active, time.Now(), time.Now(), 3.0, "url2"))
			},
			expectedErr: nil,
			expectedResult: &[]models.RecipeCompact{
				{ID: utils.GetPtr[int64](1), Name: "Recipe1", State: models.Active, Rating: utils.GetPtr[float32](4.5), MainImageName: "url1"},
				{ID: utils.GetPtr[int64](2), Name: "Recipe2", State: models.Active, Rating: utils.GetPtr[float32](3.0), MainImageName: "url2"},
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
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS rating, r\\.main_image_name FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id WHERE r\\.current_state IN \\(\\?, \\?\\) ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs(models.Active, models.Archived, 1, 0).
					WillReturnRows(sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "rating", "main_image_name"}).
						AddRow(3, "Recipe3", models.Archived, time.Now(), time.Now(), 2.0, "url3"))
			},
			expectedErr: nil,
			expectedResult: &[]models.RecipeCompact{
				{ID: utils.GetPtr[int64](3), Name: "Recipe3", State: models.Archived, Rating: utils.GetPtr[float32](2.0), MainImageName: "url3"},
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
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS rating, r\\.main_image_name FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id WHERE r\\.current_state IS NOT NULL AND \\(EXISTS \\(SELECT 1 FROM recipe_tag AS t WHERE t\\.recipe_id = r\\.id AND t\\.tag IN \\(\\?, \\?\\)\\)\\) ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs("tag1", "tag2", 1, 0).
					WillReturnRows(sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "rating", "main_image_name"}).
						AddRow(4, "Recipe4", models.Active, time.Now(), time.Now(), 5.0, "url4"))
			},
			expectedErr: nil,
			expectedResult: &[]models.RecipeCompact{
				{ID: utils.GetPtr[int64](4), Name: "Recipe4", State: models.Active, Rating: utils.GetPtr[float32](5.0), MainImageName: "url4"},
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
				dbmock.ExpectQuery("SELECT count\\(r\\.id\\) FROM recipe AS r WHERE r\\.current_state IS NOT NULL AND \\(r\\.main_image_name IS NOT NULL AND r\\.main_image_name != ''\\)").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS rating, r\\.main_image_name FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id WHERE r\\.current_state IS NOT NULL AND \\(r\\.main_image_name IS NOT NULL AND r\\.main_image_name != ''\\) ORDER BY r\\.name LIMIT \\? OFFSET \\?").
					WithArgs(1, 0).
					WillReturnRows(sqlmock.NewRows([]string{"id", "name", "current_state", "created_at", "modified_at", "rating", "main_image_name"}).
						AddRow(5, "Recipe5", models.Active, time.Now(), time.Now(), 1.0, "url5"))
			},
			expectedErr: nil,
			expectedResult: &[]models.RecipeCompact{
				{ID: utils.GetPtr[int64](5), Name: "Recipe5", State: models.Active, Rating: utils.GetPtr[float32](1.0), MainImageName: "url5"},
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
				dbmock.ExpectQuery("SELECT r\\.id, r\\.name, r\\.current_state, r\\.created_at, r\\.modified_at, COALESCE\\(g\\.rating, 0\\) AS rating, r\\.main_image_name FROM recipe AS r LEFT OUTER JOIN recipe_rating as g ON r\\.id = g\\.recipe_id WHERE r\\.current_state IS NOT NULL ORDER BY r\\.name LIMIT \\? OFFSET \\?").
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
			sut, dbmock := getMockDb(t, nil)
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
					if gotItem.State != wantItem.State {
						t.Errorf("result at index %d: State mismatch: got %v, want %v", i, gotItem.State, wantItem.State)
					}
					if (gotItem.Rating == nil && wantItem.Rating != nil) || (gotItem.Rating != nil && wantItem.Rating == nil) || (gotItem.Rating != nil && wantItem.Rating != nil && *gotItem.Rating != *wantItem.Rating) {
						t.Errorf("result at index %d: Rating mismatch: got %v, want %v", i, gotItem.Rating, wantItem.Rating)
					}
					if gotItem.MainImageName != wantItem.MainImageName {
						t.Errorf("result at index %d: MainImageName mismatch: got %v, want %v", i, gotItem.MainImageName, wantItem.MainImageName)
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
