package db

import (
	"database/sql"
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	gomock "github.com/golang/mock/gomock"
	"github.com/jmoiron/sqlx"
)

func Test_Note_Create(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		text          string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "My note", nil, nil},
		{0, "", sql.ErrNoRows, ErrNotFound},
		{0, "", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock, db := getSqlNoteDriver(t)
			defer db.Close()

			note := &models.Note{RecipeId: &test.recipeId, Text: test.text}
			expectedId := rand.Int63()

			dbmock.ExpectBegin()
			query := dbmock.ExpectQuery("INSERT INTO recipe_note \\(recipe_id, note\\) VALUES \\(\\$1, \\$2\\) RETURNING id").WithArgs(note.RecipeId, note.Text)
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedId))
				dbmock.ExpectCommit()
			} else {
				query.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Create(note)

			// Assert
			if err != test.expectedError {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if err == nil && *note.Id != expectedId {
				t.Errorf("expected note id %d, received %d", expectedId, *note.Id)
			}
		})
	}
}

func Test_Note_Update(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		noteId        int64
		text          string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 2, "My note", nil, nil},
		{0, 0, "", sql.ErrNoRows, ErrNotFound},
		{0, 0, "", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock, db := getSqlNoteDriver(t)
			defer db.Close()

			note := &models.Note{Id: &test.noteId, RecipeId: &test.recipeId, Text: test.text}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE recipe_note SET note = \\$1 WHERE ID = \\$2 AND recipe_id = \\$3").WithArgs(note.Text, note.Id, note.RecipeId)
			if test.dbError == nil {
				exec.WillReturnResult(sqlmock.NewResult(1, 1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Update(note)

			// Assert
			if err != test.expectedError {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
		})
	}
}

func Test_Note_Delete(t *testing.T) {
	type testArgs struct {
		recipeId      int64
		noteId        int64
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

			sut, dbmock, db := getSqlNoteDriver(t)
			defer db.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe_note WHERE id = \\$1 AND recipe_id = \\$2").WithArgs(test.noteId, test.recipeId)
			if test.dbError == nil {
				exec.WillReturnResult(sqlmock.NewResult(1, 1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Delete(test.recipeId, test.noteId)

			// Assert
			if err != test.expectedError {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
		})
	}
}

func Test_Note_DeleteAll(t *testing.T) {
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

			sut, dbmock, db := getSqlNoteDriver(t)
			defer db.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM recipe_note WHERE recipe_id = \\$1").WithArgs(test.recipeId)
			if test.dbError == nil {
				exec.WillReturnResult(sqlmock.NewResult(1, 1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.DeleteAll(test.recipeId)

			// Assert
			if err != test.expectedError {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
		})
	}
}

func Test_Note_List(t *testing.T) {
	type testArgs struct {
		recipeId       int64
		expectedResult *[]models.Note
		dbError        error
		expectedError  error
	}

	// Arrange
	now := time.Now()
	tests := []testArgs{
		{1, &[]models.Note{
			{
				Id:         new(int64),
				Text:       "My Note",
				CreatedAt:  &now,
				ModifiedAt: &now,
			},
			{
				Id:         new(int64),
				Text:       "My Other Note",
				CreatedAt:  &now,
				ModifiedAt: &now,
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

			sut, dbmock, db := getSqlNoteDriver(t)
			defer db.Close()

			query := dbmock.ExpectQuery("SELECT \\* FROM recipe_note WHERE recipe_id = \\$1 ORDER BY created_at DESC").WithArgs(test.recipeId)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "recipe_id", "note", "created_at", "modified_at"})
				for _, note := range *test.expectedResult {
					rows.AddRow(note.Id, test.recipeId, note.Text, note.CreatedAt, note.ModifiedAt)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			result, err := sut.List(test.recipeId)

			// Assert
			if err != test.expectedError {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
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
				} else if len(*test.expectedResult) != len(*result) {
					t.Errorf("expected %d results, received %d results", len(*test.expectedResult), len(*result))
				} else {
					for i, note := range *test.expectedResult {
						if note.Text != (*result)[i].Text {
							t.Errorf("names don't match, expected: %s, received: %s", note.Text, (*result)[i].Text)
						}
					}
				}
			}
		})
	}
}

func getSqlNoteDriver(t *testing.T) (sqlNoteDriver, sqlmock.Sqlmock, *sql.DB) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}

	dbx := sqlx.NewDb(db, "sqlmock")
	return sqlNoteDriver{dbx}, mock, db
}
