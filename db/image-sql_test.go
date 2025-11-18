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
	"go.uber.org/mock/gomock"
)

func Test_Image_Create(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		name          string
		url           string
		thumbnailURL  string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "My image", "url", "thumbnailURL", nil, nil},
		{0, "", "", "", sql.ErrNoRows, ErrNotFound},
		{0, "", "", "", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			image := &models.RecipeImage{
				RecipeID:     &test.recipeID,
				Name:         &test.name,
				URL:          &test.url,
				ThumbnailURL: &test.thumbnailURL,
			}
			expectedID := rand.Int63()

			dbmock.ExpectBegin()
			query := dbmock.ExpectQuery("INSERT INTO recipe_image \\(recipe_id, name, url, thumbnail_url\\) VALUES \\(\\$1, \\$2, \\$3, \\$4\\) RETURNING id").
				WithArgs(image.RecipeID, image.Name, image.URL, image.ThumbnailURL)
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedID))
				dbmock.ExpectExec("UPDATE recipe SET image_id = .* WHERE id = \\$1 AND image_id IS NULL").WithArgs(test.recipeID).
					WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				query.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Images().Create(t.Context(), image)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if err == nil && *image.ID != expectedID {
				t.Errorf("expected note id %d, received %d", expectedID, *image.ID)
			}
		})
	}
}

func Test_Image_Read(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		imageID       int64
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT \\* FROM recipe_image WHERE id = \\$1 AND recipe_id = \\$2").WithArgs(test.imageID, test.recipeID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "recipe_id", "name", "url", "thumbnail_url", "created_at", "modified_at"}).
					AddRow(test.imageID, test.recipeID, "My Image", "My URL", "My Thumbnail URL", time.Now(), time.Now())
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			image, err := sut.Images().Read(t.Context(), test.recipeID, test.imageID)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *image.ID != test.imageID {
				t.Errorf("ids don't match, expected: %d, received: %d", test.imageID, *image.ID)
			}
		})
	}
}

func Test_Image_ReadMainImage(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		imageID       int64
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT \\* FROM recipe_image WHERE id = \\(SELECT image_id FROM recipe WHERE id = \\$1\\)").WithArgs(test.recipeID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "recipe_id", "name", "url", "thumbnail_url", "created_at", "modified_at"}).
					AddRow(test.imageID, test.recipeID, "My Image", "My URL", "My Thumbnail URL", time.Now(), time.Now())
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			image, err := sut.Images().ReadMainImage(t.Context(), test.recipeID)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *image.ID != test.imageID {
				t.Errorf("ids don't match, expected: %d, received: %d", test.imageID, *image.ID)
			}
		})
	}
}

func Test_Image_Update(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		imageID       int64
		name          string
		url           string
		thumbnailURL  string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 2, "My image", "url", "thumbnailURL", nil, nil},
		{0, 0, "", "", "", sql.ErrNoRows, ErrNotFound},
		{0, 0, "", "", "", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE recipe_image SET recipe_id = \\$1, name = \\$2, url = \\$3, thumbnail_url = \\$4 WHERE id = \\$5").
				WithArgs(test.recipeID, test.name, test.url, test.thumbnailURL, test.imageID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Images().Update(t.Context(), &models.RecipeImage{
				ID:           &test.imageID,
				RecipeID:     &test.recipeID,
				Name:         &test.name,
				URL:          &test.url,
				ThumbnailURL: &test.thumbnailURL,
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

func Test_Image_UpdateMainImage(t *testing.T) {
	type testArgs struct {
		recipeID      int64
		imageID       int64
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE recipe SET image_id = \\$1 WHERE id = \\$2").WithArgs(test.imageID, test.recipeID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Images().UpdateMainImage(t.Context(), test.recipeID, test.imageID)

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
		recipeID      int64
		imageID       int64
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe_image WHERE id = \\$1 AND recipe_id = \\$2").WithArgs(test.imageID, test.recipeID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectExec("UPDATE recipe SET image_id = .* WHERE id = \\$1 AND image_id IS NULL").WithArgs(test.recipeID).
					WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Images().Delete(t.Context(), test.recipeID, test.imageID)

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
			exec := dbmock.ExpectExec("DELETE FROM recipe_image WHERE recipe_id = \\$1").WithArgs(test.recipeID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Images().DeleteAll(t.Context(), test.recipeID)

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
		recipeID       int64
		expectedResult []models.RecipeImage
		dbError        error
		expectedError  error
	}

	// Arrange
	now := time.Now()
	tests := []testArgs{
		{1, []models.RecipeImage{
			{
				ID:           utils.GetPtr[int64](1),
				Name:         utils.GetPtr("My Image"),
				URL:          utils.GetPtr("My URL"),
				ThumbnailURL: utils.GetPtr("My Thumbnail URL"),
				CreatedAt:    &now,
				ModifiedAt:   &now,
			},
			{
				ID:           utils.GetPtr[int64](2),
				Name:         utils.GetPtr("My Other Image"),
				URL:          utils.GetPtr("My URL"),
				ThumbnailURL: utils.GetPtr("My Thumbnail URL"),
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT \\* FROM recipe_image WHERE recipe_id = \\$1 ORDER BY created_at ASC").WithArgs(test.recipeID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "recipe_id", "name", "url", "thumbnail_url", "created_at", "modified_at"})
				for _, image := range test.expectedResult {
					rows.AddRow(image.ID, test.recipeID, image.Name, image.URL, image.ThumbnailURL, image.CreatedAt, image.ModifiedAt)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			result, err := sut.Images().List(t.Context(), test.recipeID)

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
