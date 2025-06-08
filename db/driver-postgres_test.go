package db

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/chadweimer/gomp/models"
	"github.com/golang/mock/gomock"
	"github.com/samber/lo"
)

func Test_postgres_GetSearchFields(t *testing.T) {
	type testArgs struct {
		fields []models.SearchField
		query  string
	}

	// Arrange
	tests := []testArgs{
		{[]models.SearchField{models.SearchFieldName}, "query"},
		{[]models.SearchField{models.SearchFieldName, models.SearchFieldDirections}, "query"},
		{supportedSearchFields[:], "query"},
		{[]models.SearchField{models.SearchFieldName, "invalid"}, "query"},
		{[]models.SearchField{"invalid"}, "query"},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			sut := postgresRecipeDriverAdapter{}

			// Act
			stmt, args := sut.GetSearchFields(test.fields, test.query)

			// Assert
			expectedFields := lo.Intersect(test.fields, supportedSearchFields[:])
			if len(args) != len(expectedFields) {
				t.Errorf("expected %d args, received %d", len(expectedFields), len(args))
			}
			for index, arg := range args {
				strArg, ok := arg.(string)
				if !ok {
					t.Errorf("invalid argument type: %v", arg)
				}
				if strArg != test.query {
					t.Errorf("arg at index %d, expected %v, received %v", index, test.query, arg)
				}
			}
			if stmt == "" {
				if len(expectedFields) > 0 {
					t.Error("filter should not be empty")
				}
			} else {
				segments := strings.Split(stmt, " OR ")
				if len(segments) != len(expectedFields) {
					t.Errorf("expected %d segments, received %d", len(expectedFields), len(segments))
				}
			}
		})
	}
}

func Test_lockPostgres(t *testing.T) {
	type testArgs struct {
		lock          bool
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{true, nil},
		{true, sql.ErrNoRows},
		{true, sql.ErrConnDone},
		{false, nil},
		{false, sql.ErrNoRows},
		{false, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()
			conn, err := sut.Db.Conn(context.Background())
			if err != nil {
				t.Fatalf("failed to open connection, error: %v", err)
			}
			defer conn.Close()

			action := "lock"
			if !test.lock {
				action = "unlock"
			}
			exec := dbmock.ExpectExec(fmt.Sprintf("SELECT pg_advisory_%s\\(1\\)", action))
			if test.expectedError == nil {
				exec.WillReturnResult(driver.ResultNoRows)
			} else {
				exec.WillReturnError(test.expectedError)
			}

			// Act
			if test.lock {
				err = lockPostgres(conn)
			} else {
				err = unlockPostgres(conn)
			}

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
