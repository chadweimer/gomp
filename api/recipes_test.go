package api

import (
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"go.uber.org/mock/gomock"
)

func recipeFixtureLemonGarlicChicken() *models.Recipe {
	return &models.Recipe{
		Name:                "Lemon Garlic Chicken",
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

func recipeFixtureSheetPanSausage() *models.Recipe {
	return &models.Recipe{
		Name:                "Sheet Pan Sausage and Peppers",
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

func recipeFixtureChickpeaSaladWraps() *models.Recipe {
	return &models.Recipe{
		Name:                "Chickpea Salad Wraps",
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

func Test_GetRecipe(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		recipeName    string
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, recipeFixtureLemonGarlicChicken().Name, nil},
		{2, "", db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, _ := getMockRecipesAPI(ctrl)
			expectedRecipe := models.Recipe{
				ID:   &(test.recipeID),
				Name: test.recipeName,
			}
			if test.expectedError != nil {
				recipesDriver.EXPECT().Read(t.Context(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				recipesDriver.EXPECT().Read(t.Context(), test.recipeID).Return(&expectedRecipe, nil)
			}

			// Act
			resp, err := api.GetRecipe(t.Context(), GetRecipeRequestObject{RecipeID: test.recipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test: %v, expected error: %v, received error: %v", test, test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(GetRecipe200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if resp.ID == nil {
					t.Error("expected non-null id")
				} else if *resp.ID != *expectedRecipe.ID {
					t.Errorf("expected id: %d, actual id: %d", *expectedRecipe.ID, *resp.ID)
				}
				if resp.Name != expectedRecipe.Name {
					t.Errorf("expected name: %s, actual name: %s", expectedRecipe.Name, resp.Name)
				}
			}
		})
	}
}

func Test_AddRecipe(t *testing.T) {
	type testArgs struct {
		recipe        *models.Recipe
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{
			recipeFixtureLemonGarlicChicken(), nil,
		},
		{nil, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, _ := getMockRecipesAPI(ctrl)
			if test.expectedError != nil {
				recipesDriver.EXPECT().Create(t.Context(), gomock.Any()).Return(test.expectedError)
			} else {
				recipesDriver.EXPECT().Create(t.Context(), test.recipe).Return(nil)
			}

			// Act
			resp, err := api.AddRecipe(t.Context(), AddRecipeRequestObject{Body: test.recipe})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test: %v, expected error: %v, received error: %v", test, test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(AddRecipe201JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if resp.Name != test.recipe.Name {
					t.Errorf("expected name: %s, actual name: %s", test.recipe.Name, resp.Name)
				}
			}
		})
	}
}

func Test_SaveRecipe(t *testing.T) {
	type testArgs struct {
		recipeID        int64
		recipe          *models.Recipe
		expectedDbError error
		expectedError   error
	}

	// Arrange
	tests := []testArgs{
		{
			1, recipeFixtureLemonGarlicChicken(), nil, nil,
		},
		{
			1,
			func() *models.Recipe {
				recipe := recipeFixtureSheetPanSausage()
				recipe.ID = utils.GetPtr[int64](1)
				return recipe
			}(), nil, nil,
		},
		{
			1,
			func() *models.Recipe {
				recipe := recipeFixtureChickpeaSaladWraps()
				recipe.ID = utils.GetPtr[int64](2)
				return recipe
			}(), nil, errMismatchedID,
		},
		{
			2, recipeFixtureSheetPanSausage(), db.ErrNotFound, db.ErrNotFound,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, _ := getMockRecipesAPI(ctrl)
			if test.expectedDbError != nil {
				recipesDriver.EXPECT().Update(t.Context(), gomock.Any()).Return(test.expectedDbError)
			} else {
				recipesDriver.EXPECT().Update(t.Context(), test.recipe).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveRecipe(t.Context(), SaveRecipeRequestObject{RecipeID: test.recipeID, Body: test.recipe})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test: %v, expected error: %v, received error: %v", test, test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(SaveRecipe204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func Test_DeleteRecipe(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, nil},
		{1, nil},
		{1, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, uplDriver := getMockRecipesAPI(ctrl)
			if test.expectedError != nil {
				recipesDriver.EXPECT().Delete(t.Context(), gomock.Any()).Return(test.expectedError)
			} else {
				recipesDriver.EXPECT().Delete(t.Context(), test.recipeID).Return(nil)
				uplDriver.EXPECT().DeleteAll(gomock.Any()).Return(nil)
			}

			// Act
			resp, err := api.DeleteRecipe(t.Context(), DeleteRecipeRequestObject{RecipeID: test.recipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: expected error: %v, received error '%v'", test, test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(DeleteRecipe204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func Test_SetState(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		state         models.RecipeState
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, models.Active, nil},
		{1, models.Archived, nil},
		{1, models.Active, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, _ := getMockRecipesAPI(ctrl)
			if test.expectedError != nil {
				recipesDriver.EXPECT().SetState(t.Context(), gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				recipesDriver.EXPECT().SetState(t.Context(), test.recipeID, test.state).Return(nil)
			}

			// Act
			resp, err := api.SetState(t.Context(), SetStateRequestObject{RecipeID: test.recipeID, Body: &test.state})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: expected error: %v, received error '%v'", test, test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(SetState204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func Test_GetRating(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		rating        float32
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 2.5, nil},
		{1, 3.5, nil},
		{1, 0, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, _ := getMockRecipesAPI(ctrl)
			if test.expectedError != nil {
				recipesDriver.EXPECT().GetRating(t.Context(), gomock.Any()).Return(nil, test.expectedError)
			} else {
				recipesDriver.EXPECT().GetRating(t.Context(), test.recipeID).Return(&test.rating, nil)
			}

			// Act
			resp, err := api.GetRating(t.Context(), GetRatingRequestObject{RecipeID: test.recipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: expected error: %v, received error '%v'", test, test.expectedError, err)
			} else if err == nil {
				resp, ok := resp.(GetRating200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if float32(resp) != test.rating {
					t.Errorf("test %v: expected rating: %f, received rating: %f", test, test.rating, resp)
				}
			}
		})
	}
}

func Test_SetRating(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		rating        float32
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 2.5, nil},
		{1, 3.5, nil},
		{1, 0, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, _ := getMockRecipesAPI(ctrl)
			if test.expectedError != nil {
				recipesDriver.EXPECT().SetRating(t.Context(), gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				recipesDriver.EXPECT().SetRating(t.Context(), test.recipeID, test.rating).Return(nil)
			}

			// Act
			resp, err := api.SetRating(t.Context(), SetRatingRequestObject{RecipeID: test.recipeID, Body: &test.rating})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("test %v: expected error: %v, received error '%v'", test, test.expectedError, err)
			} else if err == nil {
				_, ok := resp.(SetRating204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func Test_Find(t *testing.T) {
	type testArgs struct {
		params               FindParams
		expectedQuery        string
		expectedFields       []models.SearchField
		expectedTags         []string
		expectedStates       []models.RecipeState
		expectedWithPictures *bool
		expectedSortBy       models.SortBy
		expectedSortDir      models.SortDir
		expectedPage         int64
		expectedCount        int64
		recipes              *[]models.RecipeCompact
		total                int64
		expectedError        error
	}

	trueVal := true
	falseVal := false
	yesVal := Yes
	noVal := No
	countVal := int64(10)
	pageVal := int64(2)
	qVal := "chicken"
	fieldsVal := []models.SearchField{models.SearchFieldName, models.SearchFieldIngredients}
	tagsVal := []string{"easy", "dinner"}
	statesVal := []models.RecipeState{models.Active, models.Archived}
	sortByVal := models.SortByName
	sortDirVal := models.Desc

	tests := []testArgs{
		{
			params:               FindParams{},
			expectedQuery:        "",
			expectedFields:       []models.SearchField{},
			expectedTags:         []string{},
			expectedStates:       []models.RecipeState{},
			expectedWithPictures: nil,
			expectedSortBy:       models.SortByID,
			expectedSortDir:      models.Asc,
			expectedPage:         1,
			expectedCount:        0,
			recipes:              &[]models.RecipeCompact{{Name: "Recipe1"}},
			total:                1,
			expectedError:        nil,
		},
		{
			params: FindParams{
				Q:        &qVal,
				Fields:   &fieldsVal,
				Tags:     &tagsVal,
				States:   &statesVal,
				Pictures: &yesVal,
				Sort:     &sortByVal,
				Dir:      &sortDirVal,
				Page:     &pageVal,
				Count:    countVal,
			},
			expectedQuery:        qVal,
			expectedFields:       fieldsVal,
			expectedTags:         tagsVal,
			expectedStates:       statesVal,
			expectedWithPictures: &trueVal,
			expectedSortBy:       sortByVal,
			expectedSortDir:      sortDirVal,
			expectedPage:         pageVal,
			expectedCount:        countVal,
			recipes:              &[]models.RecipeCompact{{Name: "Recipe2"}},
			total:                5,
			expectedError:        nil,
		},
		{
			params: FindParams{
				Pictures: &noVal,
			},
			expectedQuery:        "",
			expectedFields:       []models.SearchField{},
			expectedTags:         []string{},
			expectedStates:       []models.RecipeState{},
			expectedWithPictures: &falseVal,
			expectedSortBy:       models.SortByID,
			expectedSortDir:      models.Asc,
			expectedPage:         1,
			expectedCount:        0,
			recipes:              &[]models.RecipeCompact{},
			total:                0,
			expectedError:        nil,
		},
		{
			params:               FindParams{},
			expectedQuery:        "",
			expectedFields:       []models.SearchField{},
			expectedTags:         []string{},
			expectedStates:       []models.RecipeState{},
			expectedWithPictures: nil,
			expectedSortBy:       models.SortByID,
			expectedSortDir:      models.Asc,
			expectedPage:         1,
			expectedCount:        0,
			recipes:              nil,
			total:                0,
			expectedError:        errors.New("db error"),
		},
	}

	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			api, recipesDriver, _ := getMockRecipesAPI(ctrl)

			expectedFilter := models.SearchFilter{
				Query:        test.expectedQuery,
				Fields:       test.expectedFields,
				Tags:         test.expectedTags,
				WithPictures: test.expectedWithPictures,
				States:       test.expectedStates,
				SortBy:       test.expectedSortBy,
				SortDir:      test.expectedSortDir,
			}

			if test.expectedError != nil {
				recipesDriver.EXPECT().
					Find(t.Context(), &expectedFilter, test.expectedPage, test.expectedCount).
					Return(nil, int64(0), test.expectedError)
			} else {
				recipesDriver.EXPECT().
					Find(t.Context(), &expectedFilter, test.expectedPage, test.expectedCount).
					Return(test.recipes, test.total, nil)
			}

			resp, err := api.Find(t.Context(), FindRequestObject{Params: test.params})

			if test.expectedError != nil {
				if err == nil || err.Error() != test.expectedError.Error() {
					t.Errorf("expected error: %v, got: %v", test.expectedError, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				got, ok := resp.(Find200JSONResponse)
				if !ok {
					t.Error("invalid response type")
				}
				if !reflect.DeepEqual(got.Recipes, test.recipes) {
					t.Errorf("expected recipes: %v, got: %v", test.recipes, got.Recipes)
				}
				if got.Total != test.total {
					t.Errorf("expected total: %d, got: %d", test.total, got.Total)
				}
			}
		})
	}
}

func getMockRecipesAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockRecipeDriver, *fileaccessmock.MockDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	recipeDriver := dbmock.NewMockRecipeDriver(ctrl)
	dbDriver.EXPECT().Recipes().AnyTimes().Return(recipeDriver)
	uplDriver := fileaccessmock.NewMockDriver(ctrl)
	imgCfg := fileaccess.ImageConfig{
		ImageQuality:     models.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: models.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := fileaccess.CreateImageUploader(uplDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		upl:        upl,
		db:         dbDriver,
	}
	return api, recipeDriver, uplDriver
}
