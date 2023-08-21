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

func Test_Image_Create(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		name          string
		url           string
		thumbnailUrl  string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "My image", "url", "thumbnailUrl", nil, nil},
		{0, "", "", "", sql.ErrNoRows, ErrNotFound},
		{0, "", "", "", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlRecipeImageDriver{db}

			image := &models.RecipeImage{
				RecipeId:     &test.recipeId,
				Name:         &test.name,
				Url:          &test.url,
				ThumbnailUrl: &test.thumbnailUrl,
			}
			expectedId := rand.Int63()

			dbmock.ExpectBegin()
			query := dbmock.ExpectQuery("INSERT INTO recipe_image \\(recipe_id, name, url, thumbnail_url\\) VALUES \\(\\$1, \\$2, \\$3, \\$4\\) RETURNING id").
				WithArgs(image.RecipeId, image.Name, image.Url, image.ThumbnailUrl)
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedId))
				dbmock.ExpectExec("UPDATE recipe SET image_id = .* WHERE id = \\$1 AND image_id IS NULL").WithArgs(test.recipeId).
					WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				query.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Create(image)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if err == nil && *image.Id != expectedId {
				t.Errorf("expected note id %d, received %d", expectedId, *image.Id)
			}
		})
	}
}

func Test_Image_Read(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		imageId       int64
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
			sut := sqlRecipeImageDriver{db}

			query := dbmock.ExpectQuery("SELECT \\* FROM recipe_image WHERE id = \\$1 AND recipe_id = \\$2").WithArgs(test.imageId, test.recipeId)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "recipe_id", "name", "url", "thumbnail_url", "created_at", "modified_at"}).
					AddRow(test.imageId, test.recipeId, "My Image", "My Url", "My Thumbnail Url", time.Now(), time.Now())
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			image, err := sut.Read(test.recipeId, test.imageId)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *image.Id != test.imageId {
				t.Errorf("ids don't match, expected: %d, received: %d", test.imageId, *image.Id)
			}
		})
	}
}

func Test_Image_ReadMainImage(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		imageId       int64
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
			sut := sqlRecipeImageDriver{db}

			query := dbmock.ExpectQuery("SELECT \\* FROM recipe_image WHERE id = \\(SELECT image_id FROM recipe WHERE id = \\$1\\)").WithArgs(test.recipeId)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "recipe_id", "name", "url", "thumbnail_url", "created_at", "modified_at"}).
					AddRow(test.imageId, test.recipeId, "My Image", "My Url", "My Thumbnail Url", time.Now(), time.Now())
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			image, err := sut.ReadMainImage(test.recipeId)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *image.Id != test.imageId {
				t.Errorf("ids don't match, expected: %d, received: %d", test.imageId, *image.Id)
			}
		})
	}
}

func Test_Image_UpdateMainImage(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		imageId       int64
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
			sut := sqlRecipeImageDriver{db}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE recipe SET image_id = \\$1 WHERE id = \\$2").WithArgs(test.imageId, test.recipeId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.UpdateMainImage(test.recipeId, test.imageId)

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

func Test_Image_Delete(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		imageId       int64
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
			sut := sqlRecipeImageDriver{db}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe_image WHERE id = \\$1 AND recipe_id = \\$2").WithArgs(test.imageId, test.recipeId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectExec("UPDATE recipe SET image_id = .* WHERE id = \\$1 AND image_id IS NULL").WithArgs(test.recipeId).
					WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Delete(test.recipeId, test.imageId)

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

func Test_Image_DeleteAll(t *testing.T) {
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
			sut := sqlRecipeImageDriver{db}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe_image WHERE recipe_id = \\$1").WithArgs(test.recipeId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.DeleteAll(test.recipeId)

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

func Test_Image_List(t *testing.T) {
	type testArgs struct {
		recipeId       int64
		expectedResult []models.RecipeImage
		dbError        error
		expectedError  error
	}

	// Arrange
	now := time.Now()
	tests := []testArgs{
		{1, []models.RecipeImage{
			{
				Id:           utils.GetPtr[int64](1),
				Name:         utils.GetPtr("My Image"),
				Url:          utils.GetPtr("My Url"),
				ThumbnailUrl: utils.GetPtr("My Thumbnail Url"),
				CreatedAt:    &now,
				ModifiedAt:   &now,
			},
			{
				Id:           utils.GetPtr[int64](2),
				Name:         utils.GetPtr("My Other Image"),
				Url:          utils.GetPtr("My Url"),
				ThumbnailUrl: utils.GetPtr("My Thumbnail Url"),
				CreatedAt:    &now,
				ModifiedAt:   &now,
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
			sut := sqlRecipeImageDriver{db}

			query := dbmock.ExpectQuery("SELECT \\* FROM recipe_image WHERE recipe_id = \\$1 ORDER BY created_at ASC").WithArgs(test.recipeId)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "recipe_id", "name", "url", "thumbnail_url", "created_at", "modified_at"})
				for _, image := range test.expectedResult {
					rows.AddRow(image.Id, test.recipeId, image.Name, image.Url, image.ThumbnailUrl, image.CreatedAt, image.ModifiedAt)
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
					for i, image := range test.expectedResult {
						if *image.Name != *(*result)[i].Name {
							t.Errorf("names don't match, expected: %s, received: %s", *image.Name, *(*result)[i].Name)
						}
					}
				}
			}
		})
	}
}
