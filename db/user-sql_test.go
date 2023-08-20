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
	gomock "github.com/golang/mock/gomock"
	"golang.org/x/crypto/bcrypt"
)

func Test_User_Create(t *testing.T) {
	type testArgs struct {
		username      string
		passwordHash  string
		accessLevel   models.AccessLevel
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"user@example.com", "somehash", models.Editor, nil, nil},
		{"admin@example.com", "somehash", models.Admin, nil, nil},
		{"", "", models.Viewer, sql.ErrNoRows, ErrNotFound},
		{"", "", models.Viewer, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlUserDriver{db}

			user := &UserWithPasswordHash{
				User: models.User{
					Username:    test.username,
					AccessLevel: test.accessLevel,
				},
				PasswordHash: test.passwordHash,
			}
			expectedId := rand.Int63()

			dbmock.ExpectBegin()
			query := dbmock.ExpectQuery("INSERT INTO app_user \\(username, password_hash, access_level\\) VALUES \\(\\$1, \\$2, \\$3\\) RETURNING id").
				WithArgs(user.Username, user.PasswordHash, user.AccessLevel)
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedId))
				dbmock.ExpectCommit()
			} else {
				query.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Create(user)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if err == nil && *user.Id != expectedId {
				t.Errorf("expected note id %d, received %d", expectedId, *user.Id)
			}
		})
	}
}

func Test_User_Read(t *testing.T) {
	type testArgs struct {
		userId        int64
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
			sut := sqlUserDriver{db}

			query := dbmock.ExpectQuery("SELECT \\* FROM app_user WHERE id = \\$1").WithArgs(test.userId)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "username", "password_hash", "access_level", "created_at", "modified_at"}).
					AddRow(test.userId, "user@example.com", "somehash", models.Editor, time.Now(), time.Now())
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			user, err := sut.Read(test.userId)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *user.Id != test.userId {
				t.Errorf("ids don't match, expected: %d, received: %d", test.userId, *user.Id)
			}
		})
	}
}

func Test_User_Authenticate(t *testing.T) {
	type testArgs struct {
		username          string
		currentPassword   string
		attemptedPassword string
		dbError           error
		expectedError     error
	}

	// Arrange
	tests := []testArgs{
		{"user@example.com", "password", "password", nil, nil},
		{"user@example.com", "password", "wrongpassword", nil, ErrAuthenticationFailed},
		{"", "", "", sql.ErrNoRows, ErrNotFound},
		{"", "", "", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlUserDriver{db}

			passwordHash, err := bcrypt.GenerateFromPassword([]byte(test.currentPassword), bcrypt.DefaultCost)
			if err != nil {
				t.Fatalf("failed to generate password hash: %v", err)
			}

			query := dbmock.ExpectQuery("SELECT \\* FROM app_user WHERE username = \\$1").WithArgs(test.username)
			rows := sqlmock.NewRows([]string{"id", "username", "password_hash", "access_level", "created_at", "modified_at"}).
				AddRow(1, test.username, passwordHash, models.Editor, time.Now(), time.Now())
			query.WillReturnRows(rows)
			if test.dbError != nil {
				query.WillReturnError(test.dbError)
			}

			// Act
			user, err := sut.Authenticate(test.username, test.attemptedPassword)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && user.Username != test.username {
				t.Errorf("usernames don't match, expected: %s, received: %s", test.username, user.Username)
			}
		})
	}
}

func Test_User_Update(t *testing.T) {
	type testArgs struct {
		userId        int64
		username      string
		accessLevel   models.AccessLevel
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "user@example.com", models.Admin, nil, nil},
		{0, "", models.Viewer, sql.ErrNoRows, ErrNotFound},
		{0, "", models.Viewer, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlUserDriver{db}

			user := &models.User{
				Id:          &test.userId,
				Username:    test.username,
				AccessLevel: test.accessLevel,
			}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE app_user SET username = \\$1, access_level = \\$2 WHERE ID = \\$3").
				WithArgs(user.Username, user.AccessLevel, user.Id)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Update(user)

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

func Test_User_Delete(t *testing.T) {
	type testArgs struct {
		userId        int64
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
			sut := sqlUserDriver{db}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM app_user WHERE id = \\$1").WithArgs(test.userId)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Delete(test.userId)

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

func Test_User_List(t *testing.T) {
	type testArgs struct {
		expectedResult *[]models.User
		dbError        error
		expectedError  error
	}

	// Arrange
	now := time.Now()
	tests := []testArgs{
		{&[]models.User{
			{
				Id:          getPtr[int64](1),
				Username:    "user@example.com",
				AccessLevel: models.Editor,
				CreatedAt:   &now,
				ModifiedAt:  &now,
			},
			{
				Id:          getPtr[int64](2),
				Username:    "admin@example.com",
				AccessLevel: models.Admin,
				CreatedAt:   &now,
				ModifiedAt:  &now,
			},
		}, nil, nil},
		{nil, sql.ErrNoRows, ErrNotFound},
		{nil, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlUserDriver{db}

			query := dbmock.ExpectQuery("SELECT id, username, access_level, created_at, modified_at FROM app_user ORDER BY username ASC")
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "username", "access_level", "created_at", "modified_at"})
				for _, user := range *test.expectedResult {
					rows.AddRow(user.Id, user.Username, user.AccessLevel, user.CreatedAt, user.ModifiedAt)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			result, err := sut.List()

			// Assert
			if !errors.Is(err, test.expectedError) {
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
					for i, user := range *test.expectedResult {
						if user.Username != (*result)[i].Username {
							t.Errorf("names don't match, expected: %s, received: %s", user.Username, (*result)[i].Username)
						}
					}
				}
			}
		})
	}
}
