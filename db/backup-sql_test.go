package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/golang/mock/gomock"
	"github.com/samber/lo"
)

func Test_Backup_Export(t *testing.T) {
	type testArgs struct {
		expectedTables []models.TableData
		dbError        error
		expectedError  error
	}

	tests := []testArgs{
		{
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			dbmock.MatchExpectationsInOrder(false)
			dbmock.ExpectBegin()

			tableRows := sqlmock.NewRows([]string{"name"})
			for _, table := range test.expectedTables {
				tableRows.AddRow(table.TableName)

				if len(table.Data) > 0 {
					valueRows := sqlmock.NewRows(lo.Keys(table.Data[0]))
					for _, row := range table.Data {
						values := lo.Map(lo.Values(row), func(v any, _ int) driver.Value {
							return driver.Value(v)
						})
						valueRows.AddRow(values...)
					}
					dbmock.ExpectQuery(fmt.Sprintf("SELECT \\* FROM %s", table.TableName)).
						WillReturnRows(valueRows)
				}
			}

			if test.dbError == nil {
				dbmock.ExpectCommit()
				dbmock.ExpectQuery("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").
					WillReturnRows(tableRows)
			} else {
				dbmock.ExpectRollback()
				dbmock.ExpectQuery("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").
					WillReturnError(test.dbError)
			}

			// Act
			backup, err := sut.Backups().Export()

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedTables == nil {
				if backup != nil {
					t.Errorf("expected backup to be nil")
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
