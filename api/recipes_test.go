package api

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/chadweimer/gomp/utils"
	"github.com/golang/mock/gomock"
)

func Test_GetRecipe(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		recipeName    string
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "My Recipe", nil},
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
				recipesDriver.EXPECT().Read(gomock.Any()).Return(nil, test.expectedError)
			} else {
				recipesDriver.EXPECT().Read(test.recipeID).Return(&expectedRecipe, nil)
			}

			// Act
			resp, err := api.GetRecipe(context.Background(), GetRecipeRequestObject{RecipeID: test.recipeID})

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
			&models.Recipe{
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My Url",
			}, nil,
		},
		{nil, db.ErrNotFound},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, _ := getMockRecipesAPI(ctrl)
			if test.expectedError != nil {
				recipesDriver.EXPECT().Create(gomock.Any()).Return(test.expectedError)
			} else {
				recipesDriver.EXPECT().Create(test.recipe).Return(nil)
			}

			// Act
			resp, err := api.AddRecipe(context.Background(), AddRecipeRequestObject{Body: test.recipe})

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
			1,
			&models.Recipe{
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My Url",
			}, nil, nil,
		},
		{
			1,
			&models.Recipe{
				ID:                  utils.GetPtr[int64](1),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My Url",
			}, nil, nil,
		},
		{
			1,
			&models.Recipe{
				ID:                  utils.GetPtr[int64](2),
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My Url",
			}, nil, errMismatchedID,
		},
		{
			2,
			&models.Recipe{
				Name:                "My Recipe",
				Ingredients:         "My Ingredients",
				Directions:          "My Directions",
				NutritionInfo:       "My Nutrition Info",
				ServingSize:         "My Serving Size",
				StorageInstructions: "My Storage Instructions",
				SourceURL:           "My Url",
			}, db.ErrNotFound, db.ErrNotFound,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, recipesDriver, _ := getMockRecipesAPI(ctrl)
			if test.expectedDbError != nil {
				recipesDriver.EXPECT().Update(gomock.Any()).Return(test.expectedDbError)
			} else {
				recipesDriver.EXPECT().Update(test.recipe).MaxTimes(1).Return(nil)
			}

			// Act
			resp, err := api.SaveRecipe(context.Background(), SaveRecipeRequestObject{RecipeID: test.recipeID, Body: test.recipe})

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
				recipesDriver.EXPECT().Delete(gomock.Any()).Return(test.expectedError)
			} else {
				recipesDriver.EXPECT().Delete(test.recipeID).Return(nil)
				uplDriver.EXPECT().DeleteAll(gomock.Any()).Return(nil)
			}

			// Act
			resp, err := api.DeleteRecipe(context.Background(), DeleteRecipeRequestObject{RecipeID: test.recipeID})

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
				recipesDriver.EXPECT().SetState(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				recipesDriver.EXPECT().SetState(test.recipeID, test.state).Return(nil)
			}

			// Act
			resp, err := api.SetState(context.Background(), SetStateRequestObject{RecipeID: test.recipeID, Body: &test.state})

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
				recipesDriver.EXPECT().GetRating(gomock.Any()).Return(nil, test.expectedError)
			} else {
				recipesDriver.EXPECT().GetRating(test.recipeID).Return(&test.rating, nil)
			}

			// Act
			resp, err := api.GetRating(context.Background(), GetRatingRequestObject{RecipeID: test.recipeID})

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
				recipesDriver.EXPECT().SetRating(gomock.Any(), gomock.Any()).Return(test.expectedError)
			} else {
				recipesDriver.EXPECT().SetRating(test.recipeID, test.rating).Return(nil)
			}

			// Act
			resp, err := api.SetRating(context.Background(), SetRatingRequestObject{RecipeID: test.recipeID, Body: &test.rating})

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

func getMockRecipesAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockRecipeDriver, *uploadmock.MockDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	recipeDriver := dbmock.NewMockRecipeDriver(ctrl)
	dbDriver.EXPECT().Recipes().AnyTimes().Return(recipeDriver)
	uplDriver := uploadmock.NewMockDriver(ctrl)
	imgCfg := upload.ImageConfig{
		ImageQuality:     upload.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: upload.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := upload.CreateImageUploader(uplDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		upl:        upl,
		db:         dbDriver,
	}
	return api, recipeDriver, uplDriver
}
