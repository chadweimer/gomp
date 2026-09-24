package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
	"go.uber.org/mock/gomock"
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
			sut := postgresDriverAdapter{}

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

func Test_postgres_GetTableNames(t *testing.T) {
	type testArgs struct {
		name           string
		dbError        error
		wantTableNames []string
		wantErr        error
	}

	tests := []testArgs{
		{
			name:           "success",
			dbError:        nil,
			wantTableNames: []string{"table1", "table2"},
			wantErr:        nil,
		},
		{
			name:           "error",
			dbError:        sql.ErrConnDone,
			wantTableNames: []string{},
			wantErr:        sql.ErrConnDone,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			dbDriver, dbmock := getMockDb(t, nil)
			defer dbDriver.Close()

			query := dbmock.ExpectQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"table_name"})
				for _, tableName := range test.wantTableNames {
					rows.AddRow(tableName)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			sut := postgresDriverAdapter{}

			// Act
			got, err := sut.GetTableNames(t.Context(), dbDriver.Db)

			// Assert
			if !errors.Is(err, test.wantErr) {
				t.Errorf("expected error %v, received %v", test.wantErr, err)
			}
			missingWant, extraGot := lo.Difference(test.wantTableNames, got)
			if len(missingWant) > 0 {
				t.Errorf("missing table names: %v", missingWant)
			}
			if len(extraGot) > 0 {
				t.Errorf("extra table names: %v", extraGot)
			}
		})
	}
}

func Test_postgres_PostExport(t *testing.T) {
	type testArgs struct {
		name       string
		backup     models.BackupData
		wantBackup models.BackupData
	}

	tests := []testArgs{
		{
			name: "binary converted to string",
			backup: models.BackupData{
				{
					TableName: "table1",
					Data: []models.RowData{
						{
							"int_column":    1,
							"string_column": "string",
							"binary_column": []byte("binary"),
						},
					},
				},
			},
			wantBackup: models.BackupData{
				{
					TableName: "table1",
					Data: []models.RowData{
						{
							"int_column":    1,
							"string_column": "string",
							"binary_column": "binary",
						},
					},
				},
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			dbDriver, _ := getMockDb(t, nil)
			defer dbDriver.Close()
			conn, err := dbDriver.Db.Conn(t.Context())
			if err != nil {
				t.Fatalf("failed to open connection, error: %v", err)
			}
			defer conn.Close()

			sut := postgresDriverAdapter{}

			// Act
			err = sut.PostExport(t.Context(), dbDriver.Db, &test.backup)

			// Assert
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !reflect.DeepEqual(test.backup, test.wantBackup) {
				t.Errorf("expected backup %v, received %v", test.wantBackup, test.backup)
			}
		})
	}
}

func Test_postgres_PostImport(t *testing.T) {
	type testArgs struct {
		name            string
		backup          models.BackupData
		dbError         error
		expectedColumns map[string][]string
		wantErr         error
	}

	tests := []testArgs{
		{
			name: "all columns checked",
			backup: models.BackupData{
				{
					TableName: "table1",
					Data: []models.RowData{
						{
							"column1": 1,
							"column2": 2,
						},
					},
				},
				{
					TableName: "table2",
					Data: []models.RowData{
						{
							"column1": 1,
							"column2": 2,
						},
					},
				},
			},
			expectedColumns: map[string][]string{
				"table1": {"column1", "column2"},
				"table2": {"column1", "column2"},
			},
		},
		{
			name: "db error",
			backup: models.BackupData{
				{
					TableName: "table1",
					Data: []models.RowData{
						{
							"column1": 1,
							"column2": 2,
						},
					},
				},
				{
					TableName: "table2",
					Data: []models.RowData{
						{
							"column1": 1,
							"column2": 2,
						},
					},
				},
			},
			expectedColumns: map[string][]string{
				"table1": {"column1", "column2"},
				"table2": {"column1", "column2"},
			},
			dbError: sql.ErrConnDone,
			wantErr: sql.ErrConnDone,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			dbDriver, dbMock := getMockDb(t, nil)
			defer dbDriver.Close()
			conn, err := dbDriver.Db.Conn(t.Context())
			if err != nil {
				t.Fatalf("failed to open connection, error: %v", err)
			}
			defer conn.Close()

			dbMock.MatchExpectationsInOrder(false)
			for tableName, columns := range test.expectedColumns {
				for _, columnName := range columns {
					exec := dbMock.ExpectExec(fmt.Sprintf("SELECT sync_seq\\('%s', '%s'\\)", tableName, columnName))
					if test.dbError == nil {
						exec.WillReturnResult(driver.ResultNoRows)
					} else {
						exec.WillReturnError(test.dbError)
					}
				}
			}

			sut := postgresDriverAdapter{}

			// Act
			err = sut.PostImport(t.Context(), dbDriver.Db, &test.backup)

			// Assert
			if !errors.Is(err, test.wantErr) {
				t.Errorf("expected error %v, received %v", test.wantErr, err)
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

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()
			conn, err := sut.Db.Conn(t.Context())
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
