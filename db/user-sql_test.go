package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"math/rand"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
	"golang.org/x/crypto/bcrypt"
)

func Test_User_Create(t *testing.T) {
	type testArgs struct {
		name          string
		username      string
		password      string
		accessLevel   models.AccessLevel
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"successful create", "user@example.com", "password", models.Editor, nil, nil},
		{"successful create admin", "admin@example.com", "password", models.Admin, nil, nil},
		{"no rows found", "", "", models.Viewer, sql.ErrNoRows, ErrNotFound},
		{"connection done", "", "", models.Viewer, sql.ErrConnDone, sql.ErrConnDone},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			user := &models.User{
				Username:    test.username,
				AccessLevel: test.accessLevel,
			}
			expectedID := rand.Int63()

			dbmock.ExpectBegin()
			query := dbmock.ExpectQuery("INSERT INTO app_user \\(username, password_hash, access_level\\) VALUES \\(\\$1, \\$2, \\$3\\) RETURNING id").
				WithArgs(user.Username, passwordHashArgument(test.password), user.AccessLevel)
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedID))
				dbmock.ExpectCommit()
			} else {
				query.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Users().Create(t.Context(), user, test.password)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if err == nil && *user.ID != expectedID {
				t.Errorf("expected user id %d, received %d", expectedID, *user.ID)
			}
		})
	}
}

func Test_User_Read(t *testing.T) {
	type testArgs struct {
		name          string
		userID        int64
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"successful read", 1, nil, nil},
		{"no rows found", 0, sql.ErrNoRows, ErrNotFound},
		{"connection done", 0, sql.ErrConnDone, sql.ErrConnDone},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT \\* FROM app_user WHERE id = \\$1").WithArgs(test.userID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "username", "password_hash", "access_level", "created_at", "modified_at"}).
					AddRow(test.userID, "user@example.com", "somehash", models.Editor, time.Now(), time.Now())
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			user, err := sut.Users().Read(t.Context(), test.userID)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *user.ID != test.userID {
				t.Errorf("ids don't match, expected: %d, received: %d", test.userID, *user.ID)
			}
		})
	}
}

func Test_User_Authenticate(t *testing.T) {
	type testArgs struct {
		name              string
		username          string
		currentPassword   string
		attemptedPassword string
		dbError           error
		expectedError     error
	}

	// Arrange
	tests := []testArgs{
		{"successful authentication", "user@example.com", "password", "password", nil, nil},
		{"failed authentication", "user@example.com", "password", "wrongpassword", nil, ErrAuthenticationFailed},
		{"no rows found", "", "", "", sql.ErrNoRows, ErrNotFound},
		{"connection done", "", "", "", sql.ErrConnDone, sql.ErrConnDone},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

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
			user, err := sut.Users().Authenticate(t.Context(), test.username, test.attemptedPassword)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
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
		name          string
		userID        int64
		username      string
		accessLevel   models.AccessLevel
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"successful update", 1, "user@example.com", models.Admin, nil, nil},
		{"no rows found", 0, "", models.Viewer, sql.ErrNoRows, ErrNotFound},
		{"connection done", 0, "", models.Viewer, sql.ErrConnDone, sql.ErrConnDone},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			user := &models.User{
				ID:          &test.userID,
				Username:    test.username,
				AccessLevel: test.accessLevel,
			}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE app_user SET username = \\$1, access_level = \\$2 WHERE ID = \\$3").
				WithArgs(user.Username, user.AccessLevel, user.ID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Users().Update(t.Context(), user)

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

func Test_User_UpdatePassword(t *testing.T) {
	type testArgs struct {
		name              string
		userID            int64
		currentPassword   string
		attemptedPassword string
		newPassword       string
		dbError           error
		expectedError     error
	}

	// Arrange
	tests := []testArgs{
		{"successful update password", 1, "password", "password", "newpassword", nil, nil},
		{"failed authentication", 1, "password", "wrongpassword", "newpassword", nil, ErrAuthenticationFailed},
		{"no rows found", 0, "password", "password", "newpassword", sql.ErrNoRows, ErrNotFound},
		{"connection done", 0, "password", "password", "newpassword", sql.ErrConnDone, sql.ErrConnDone},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			currentPasswordHash, err := hashPassword(test.currentPassword)
			if err != nil {
				t.Fatalf("failed to hash password: %v", err)
			}

			dbmock.ExpectBegin()
			rows := sqlmock.NewRows([]string{"id", "username", "password_hash", "access_level", "created_at", "modified_at"}).
				AddRow(test.userID, "user@example.com", currentPasswordHash, models.Editor, time.Now(), time.Now())
			dbmock.ExpectQuery("SELECT \\* FROM app_user WHERE id = \\$1").WithArgs(test.userID).WillReturnRows(rows)
			if test.dbError != nil || test.expectedError == nil {
				exec := dbmock.ExpectExec("UPDATE app_user SET password_hash = \\$1 WHERE ID = \\$2").WithArgs(passwordHashArgument(test.newPassword), test.userID)
				if test.dbError == nil {
					exec.WillReturnResult(driver.RowsAffected(1))
					dbmock.ExpectCommit()
				} else {
					exec.WillReturnError(test.dbError)
					dbmock.ExpectRollback()
				}
			} else {
				dbmock.ExpectRollback()
			}

			// Act
			err = sut.Users().UpdatePassword(t.Context(), test.userID, test.attemptedPassword, test.newPassword)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %v", err)
			}
		})
	}
}

func Test_User_Delete(t *testing.T) {
	type testArgs struct {
		name          string
		userID        int64
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"successful delete", 1, nil, nil},
		{"no rows found", 0, sql.ErrNoRows, ErrNotFound},
		{"connection done", 0, sql.ErrConnDone, sql.ErrConnDone},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM app_user WHERE id = \\$1").WithArgs(test.userID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Users().Delete(t.Context(), test.userID)

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

func Test_User_List(t *testing.T) {
	type testArgs struct {
		name           string
		page           int64
		count          int64
		expectedTotal  int64
		expectedResult []models.User
		countDbError   error
		selectDbError  error
		expectedError  error
	}

	// Arrange
	now := time.Now()
	tests := []testArgs{
		{
			name:          "first page",
			page:          1,
			count:         10,
			expectedTotal: 2,
			expectedResult: []models.User{
				{
					ID:          new(int64(1)),
					Username:    "user@example.com",
					AccessLevel: models.Editor,
					CreatedAt:   &now,
					ModifiedAt:  &now,
				},
				{
					ID:          new(int64(2)),
					Username:    "admin@example.com",
					AccessLevel: models.Admin,
					CreatedAt:   &now,
					ModifiedAt:  &now,
				},
			},
		},
		{
			name:          "second page",
			page:          2,
			count:         5,
			expectedTotal: 12,
			expectedResult: []models.User{
				{
					ID:          new(int64(3)),
					Username:    "other@example.com",
					AccessLevel: models.Viewer,
					CreatedAt:   &now,
					ModifiedAt:  &now,
				},
			},
		},
		{
			name:          "count query error",
			page:          1,
			count:         10,
			countDbError:  sql.ErrConnDone,
			expectedError: sql.ErrConnDone,
		},
		{
			name:          "select query error",
			page:          1,
			count:         10,
			selectDbError: sql.ErrConnDone,
			expectedError: sql.ErrConnDone,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			countQuery := dbmock.ExpectQuery("SELECT count\\(id\\) FROM app_user")
			if test.countDbError != nil {
				countQuery.WillReturnError(test.countDbError)
			} else {
				countRows := sqlmock.NewRows([]string{"count"}).AddRow(test.expectedTotal)
				countQuery.WillReturnRows(countRows)

				selectQuery := dbmock.ExpectQuery("SELECT id, username, access_level, created_at, modified_at FROM app_user ORDER BY username ASC")
				if test.count >= 0 {
					selectQuery.WithArgs(test.count, test.count*(test.page-1))
				}
				if test.selectDbError != nil {
					selectQuery.WillReturnError(test.selectDbError)
				} else {
					rows := sqlmock.NewRows([]string{"id", "username", "access_level", "created_at", "modified_at"})
					for _, user := range test.expectedResult {
						rows.AddRow(user.ID, user.Username, user.AccessLevel, user.CreatedAt, user.ModifiedAt)
					}
					selectQuery.WillReturnRows(rows)
				}
			}

			// Act
			result, total, err := sut.Users().List(t.Context(), test.page, test.count)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil {
				if total != test.expectedTotal {
					t.Errorf("expected total: %d, received: %d", test.expectedTotal, total)
				}
				if result == nil {
					t.Errorf("expected results %v, but did not receive any", test.expectedResult)
				} else if len(test.expectedResult) != len(*result) {
					t.Errorf("expected %d results, received %d results", len(test.expectedResult), len(*result))
				} else {
					for i, user := range test.expectedResult {
						if user.Username != (*result)[i].Username {
							t.Errorf("names don't match, expected: %s, received: %s", user.Username, (*result)[i].Username)
						}
					}
				}
			}
		})
	}
}

type passwordHashArgument string

func (p passwordHashArgument) Match(value driver.Value) bool {
	valueBytes, ok := value.([]byte)
	if !ok {
		return false
	}

	return verifyPassword(valueBytes, string(p))
}
