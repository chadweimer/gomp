package db

import (
	"database/sql"
	"fmt"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	gomock "github.com/golang/mock/gomock"
	"github.com/jmoiron/sqlx"
)

func Test_Read(t *testing.T) {
	type testArgs struct {
		title         string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"My App Title", nil, nil},
		{"", sql.ErrNoRows, ErrNotFound},
		{"", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock, db := getSqlAppConfigurationDriver(t)
			defer db.Close()

			if test.dbError == nil {
				dbmock.ExpectQuery("SELECT \\* FROM app_configuration").
					WillReturnRows(sqlmock.NewRows([]string{"title"}).FromCSVString(test.title))
			} else {
				dbmock.ExpectQuery("SELECT \\* FROM app_configuration").
					WillReturnError(test.dbError)
			}

			// Act
			cfg, err := sut.Read()

			// Assert
			if err != test.expectedError {
				t.Errorf("expected error: %v, received error: %v", ErrNotFound, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil {
				if cfg.Title != test.title {
					t.Errorf("expected: '%s', received: '%s'", test.title, cfg.Title)
				}
			}
		})
	}
}

func Test_Update(t *testing.T) {
	type testArgs struct {
		title         string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"My App Title", nil, nil},
		{"", sql.ErrNoRows, ErrNotFound},
		{"", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock, db := getSqlAppConfigurationDriver(t)
			defer db.Close()

			if test.dbError == nil {
				dbmock.ExpectBegin()
				dbmock.ExpectExec("UPDATE app_configuration SET title = \\$1").WithArgs(test.title).
					WillReturnResult(sqlmock.NewResult(0, 1))
				dbmock.ExpectCommit()
			} else {
				dbmock.ExpectBegin()
				dbmock.ExpectExec("UPDATE app_configuration SET title = \\$1").WithArgs(test.title).
					WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Update(&models.AppConfiguration{Title: test.title})

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

func getSqlAppConfigurationDriver(t *testing.T) (sqlAppConfigurationDriver, sqlmock.Sqlmock, *sql.DB) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}

	dbx := sqlx.NewDb(db, "sqlmock")
	return sqlAppConfigurationDriver{dbx}, mock, db
}
