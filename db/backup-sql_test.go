package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"slices"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
	"go.uber.org/mock/gomock"
)

func Test_Backup_Export(t *testing.T) {
	type testArgs struct {
		mockTableNames []string
		expectedTables []models.TableData
		dbError        error
		expectedError  error
	}

	tests := []testArgs{
		{
			mockTableNames: []string{"table1", "table2"},
			expectedTables: []models.TableData{
				{
					TableName: "table1",
					Data: []models.RowData{
						{"column1": "value1", "column2": "value2"},
						{"column1": "value3", "column2": "value4"},
					},
				},
				{
					TableName: "table2",
					Data: []models.RowData{
						{"column3": "value5", "column4": "value6"},
						{"column3": "value7", "column4": "value8"},
					},
				},
			},
			dbError:       nil,
			expectedError: nil,
		},
		{
			mockTableNames: []string{"table1"},
			expectedTables: nil,
			dbError:        sql.ErrConnDone,
			expectedError:  sql.ErrConnDone,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockAdapter := mockDriverAdapter{tableNames: test.mockTableNames}
			sut, dbmock := getMockDb(t, mockAdapter)
			defer sut.Close()

			dbmock.MatchExpectationsInOrder(false)
			dbmock.ExpectBegin()

			tableRows := sqlmock.NewRows([]string{"name"})
			for _, tableName := range test.mockTableNames {
				tableRows.AddRow(tableName)

				if test.dbError == nil {
					// Get the table data
					table, ok := lo.Find(test.expectedTables, func(table models.TableData) bool {
						return table.TableName == tableName
					})

					if ok && len(table.Data) > 0 {
						columns := slices.Sorted(slices.Values(lo.Keys(table.Data[0])))
						valueRows := sqlmock.NewRows(columns)
						for _, row := range table.Data {
							// Sort for consistent order
							sortedRows := slices.SortedFunc(slices.Values(lo.Entries(row)), func(a, b lo.Entry[string, any]) int {
								switch {
								case a.Key < b.Key:
									return -1
								case a.Key > b.Key:
									return 1
								default:
									return 0
								}
							})

							values := lo.Map(sortedRows, func(v lo.Entry[string, any], _ int) driver.Value {
								return driver.Value(v.Value)
							})
							valueRows.AddRow(values...)
						}
						dbmock.ExpectQuery(fmt.Sprintf("SELECT \\* FROM %s", tableName)).
							WillReturnRows(valueRows)
					}
				} else {
					dbmock.ExpectQuery(fmt.Sprintf("SELECT \\* FROM %s", tableName)).
						WillReturnError(test.dbError)
				}
			}

			if test.dbError == nil {
				dbmock.ExpectCommit()
			} else {
				dbmock.ExpectRollback()
			}

			// Act
			backup, err := sut.Backups().Export(t.Context())

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedTables == nil {
				if backup != nil {
					t.Error("expected backup to be nil")
				}

				return
			}
			// Assert that backup matches expected tables
			actualTableNames := lo.Map(*backup, func(table models.TableData, _ int) string {
				return table.TableName
			})
			expectedTableNames := lo.Map(test.expectedTables, func(table models.TableData, _ int) string {
				return table.TableName
			})
			missingExpectedTableNames, extraActualTableNames := lo.Difference(expectedTableNames, actualTableNames)
			if len(missingExpectedTableNames) > 0 {
				t.Errorf("missing expected tables: %v", missingExpectedTableNames)
			}
			if len(extraActualTableNames) > 0 {
				t.Errorf("extra actual tables: %v", extraActualTableNames)
			}
			// Assert that rows matches expected rows
			for _, expectedTable := range test.expectedTables {
				actualTable, _ := lo.Find(*backup, func(table models.TableData) bool {
					return table.TableName == expectedTable.TableName
				})
				actualRowCount := len(actualTable.Data)
				expectedRowCount := len(expectedTable.Data)
				if actualRowCount != expectedRowCount {
					t.Errorf("table %s: expected %d rows, got %d", expectedTable.TableName, expectedRowCount, actualRowCount)
				}
				for _, actualRow := range actualTable.Data {
					_, ok := lo.Find(expectedTable.Data, func(row models.RowData) bool {
						e, a := lo.Difference(lo.Entries(actualRow), lo.Entries(row))
						return len(e) == 0 && len(a) == 0
					})
					if !ok {
						t.Errorf("unexpected row in table %s: %v", expectedTable.TableName, actualRow)
					}
				}
			}
		})
	}
}

func Test_Backup_Import(t *testing.T) {
	type testArgs struct {
		input         models.BackupData
		dbError       error
		expectedError error
	}

	tests := []testArgs{
		{
			input: models.BackupData{
				{
					TableName: "table1",
					Data: []models.RowData{
						{"column1": "value1", "column2": "value2"},
						{"column1": "value3", "column2": "value4"},
					},
				},
				{
					TableName: "table2",
					Data: []models.RowData{
						{"column3": "value5", "column4": "value6"},
						{"column3": "value7", "column4": "value8"},
					},
				},
			},
			dbError:       nil,
			expectedError: nil,
		},
		{
			input:         models.BackupData{},
			dbError:       nil,
			expectedError: nil,
		},
		{
			input: models.BackupData{
				{
					TableName: "table1",
					Data: []models.RowData{
						{"column1": "value1", "column2": "value2"},
						{"column1": "value3", "column2": "value4"},
					},
				},
			},
			dbError:       sql.ErrConnDone,
			expectedError: sql.ErrConnDone,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			dbmock.ExpectBegin()

			if test.dbError == nil {
				for _, table := range test.input {
					dbmock.ExpectExec(fmt.Sprintf("DELETE FROM %s", table.TableName)).
						WillReturnResult(sqlmock.NewResult(1, 1))
				}
				for _, table := range test.input {
					stmt := dbmock.ExpectPrepare(fmt.Sprintf("INSERT INTO %s \\(.*\\) VALUES \\(.*\\)", table.TableName)).
						WillBeClosed()
					for range table.Data {
						stmt.ExpectExec().WillReturnResult(sqlmock.NewResult(1, 1))
					}
				}
				dbmock.ExpectCommit()
			} else {
				dbmock.ExpectExec(fmt.Sprintf("DELETE FROM %s", test.input[0].TableName)).
					WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Backups().Import(t.Context(), &test.input)

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
