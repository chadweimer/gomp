package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	gomock "github.com/golang/mock/gomock"
)

func Test_AppConfiguration_Read(t *testing.T) {
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

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlAppConfigurationDriver{db}

			query := dbmock.ExpectQuery("SELECT \\* FROM app_configuration")
			if test.dbError == nil {
				query.WillReturnRows(sqlmock.NewRows([]string{"title"}).FromCSVString(test.title))
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			cfg, err := sut.Read()

			// Assert
			if !errors.Is(err, test.expectedError) {
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

func Test_AppConfiguration_Update(t *testing.T) {
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

			db, dbmock := getMockDb(t)
			defer db.Close()
			sut := sqlAppConfigurationDriver{db}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE app_configuration SET title = \\$1").WithArgs(test.title)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Update(&models.AppConfiguration{Title: test.title})

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
