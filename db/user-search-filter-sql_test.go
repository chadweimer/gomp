package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"math/rand"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"go.uber.org/mock/gomock"
)

func Test_UserSearchFilter_Create(t *testing.T) {
	type testArgs struct {
		searchFilter      *models.SavedSearchFilter
		preConditionError error
		dbError           error
		expectedError     error
	}

	// Arrange
	tests := []testArgs{
		{
			&models.SavedSearchFilter{
				UserID:       utils.GetPtr[int64](1),
				Name:         "My Filter",
				Query:        "My Query",
				WithPictures: utils.GetPtr[bool](true),
				SortBy:       models.SortByCreated,
				SortDir:      models.Desc,
				Fields:       []models.SearchField{models.SearchFieldName, models.SearchFieldIngredients},
				States:       []models.RecipeState{models.Active, models.Archived},
				Tags:         []string{"weeknight", "high-protein"},
			},
			nil,
			nil,
			nil,
		},
		{
			&models.SavedSearchFilter{},
			ErrMissingID,
			nil,
			ErrMissingID,
		},
		{
			&models.SavedSearchFilter{
				UserID: utils.GetPtr[int64](1),
			},
			nil,
			sql.ErrNoRows,
			ErrNotFound,
		},
		{
			&models.SavedSearchFilter{
				UserID: utils.GetPtr[int64](1),
			},
			nil,
			sql.ErrConnDone,
			sql.ErrConnDone,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			expectedID := rand.Int63()

			dbmock.ExpectBegin()
			if test.preConditionError == nil {
				query := dbmock.ExpectQuery(
					"INSERT INTO search_filter \\(user_id, name, query, with_pictures, sort_by, sort_dir\\) VALUES \\(\\$1, \\$2, \\$3, \\$4, \\$5, \\$6\\) RETURNING id").
					WithArgs(
						test.searchFilter.UserID,
						test.searchFilter.Name,
						test.searchFilter.Query,
						test.searchFilter.WithPictures,
						test.searchFilter.SortBy,
						test.searchFilter.SortDir)
				if test.dbError == nil {
					query.WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(expectedID))

					dbmock.ExpectExec("DELETE FROM search_filter_field WHERE search_filter_id = \\$1").
						WithArgs(expectedID).
						WillReturnResult(driver.RowsAffected(1))
					for _, field := range test.searchFilter.Fields {
						dbmock.ExpectExec("INSERT INTO search_filter_field \\(search_filter_id, field_name\\) VALUES \\(\\$1, \\$2\\)").
							WithArgs(expectedID, field).
							WillReturnResult(driver.RowsAffected(1))
					}

					dbmock.ExpectExec("DELETE FROM search_filter_state WHERE search_filter_id = \\$1").
						WithArgs(expectedID).
						WillReturnResult(driver.RowsAffected(1))
					for _, state := range test.searchFilter.States {
						dbmock.ExpectExec("INSERT INTO search_filter_state \\(search_filter_id, state\\) VALUES \\(\\$1, \\$2\\)").
							WithArgs(expectedID, state).
							WillReturnResult(driver.RowsAffected(1))
					}

					dbmock.ExpectExec("DELETE FROM search_filter_tag WHERE search_filter_id = \\$1").
						WithArgs(expectedID).
						WillReturnResult(driver.RowsAffected(1))
					for _, tag := range test.searchFilter.Tags {
						dbmock.ExpectExec("INSERT INTO search_filter_tag \\(search_filter_id, tag\\) VALUES \\(\\$1, \\$2\\)").
							WithArgs(expectedID, tag).
							WillReturnResult(driver.RowsAffected(1))
					}

					dbmock.ExpectCommit()
				} else {
					query.WillReturnError(test.dbError)
					dbmock.ExpectRollback()
				}
			} else {
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.UserSearchFilters().Create(t.Context(), test.searchFilter)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if err == nil && *test.searchFilter.ID != expectedID {
				t.Errorf("expected note id %d, received %d", expectedID, *test.searchFilter.ID)
			}
		})
	}
}

func Test_UserSearchFilter_Read(t *testing.T) {
	type testArgs struct {
		userID        int64
		filterID      int64
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, 2, nil, nil},
		{1, 2, sql.ErrNoRows, ErrNotFound},
		{1, 2, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT \\* FROM search_filter WHERE id = \\$1 AND user_id = \\$2").
				WithArgs(test.filterID, test.userID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "name", "query", "with_pictures", "sort_by", "sort_dir"}).
					AddRow(test.filterID, "My Filter", "My Query", true, models.SortByID, models.Asc)
				query.WillReturnRows(rows)

				dbmock.ExpectQuery("SELECT field_name FROM search_filter_field WHERE search_filter_id = \\$1").
					WithArgs(test.filterID).
					WillReturnRows(&sqlmock.Rows{})

				dbmock.ExpectQuery("SELECT state FROM search_filter_state WHERE search_filter_id = \\$1").
					WithArgs(test.filterID).
					WillReturnRows(&sqlmock.Rows{})

				dbmock.ExpectQuery("SELECT tag FROM search_filter_tag WHERE search_filter_id = \\$1").
					WithArgs(test.filterID).
					WillReturnRows(&sqlmock.Rows{})
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			_, err := sut.UserSearchFilters().Read(t.Context(), test.userID, test.filterID)

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

func Test_UserSearchFilter_Update(t *testing.T) {
	type testArgs struct {
		searchFilter      *models.SavedSearchFilter
		preConditionError error
		dbError           error
		expectedError     error
	}

	// Arrange
	tests := []testArgs{
		{
			&models.SavedSearchFilter{
				UserID:       utils.GetPtr[int64](1),
				ID:           utils.GetPtr[int64](2),
				Name:         "My Filter",
				Query:        "My Query",
				WithPictures: utils.GetPtr[bool](true),
				SortBy:       models.SortByCreated,
				SortDir:      models.Desc,
				Fields:       []models.SearchField{models.SearchFieldName, models.SearchFieldIngredients},
				States:       []models.RecipeState{models.Active, models.Archived},
				Tags:         []string{"weeknight", "high-protein"},
			},
			nil,
			nil,
			nil,
		},
		{
			&models.SavedSearchFilter{
				ID: utils.GetPtr[int64](2),
			},
			ErrMissingID,
			nil,
			ErrMissingID,
		},
		{
			&models.SavedSearchFilter{
				UserID: utils.GetPtr[int64](1),
			},
			ErrMissingID,
			nil,
			ErrMissingID,
		},
		{
			&models.SavedSearchFilter{
				UserID: utils.GetPtr[int64](1),
				ID:     utils.GetPtr[int64](2),
			},
			nil,
			sql.ErrNoRows,
			ErrNotFound,
		},
		{
			&models.SavedSearchFilter{
				UserID: utils.GetPtr[int64](1),
				ID:     utils.GetPtr[int64](2),
			},
			nil,
			sql.ErrConnDone,
			sql.ErrConnDone,
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
			if test.preConditionError == nil {
				dbmock.ExpectQuery("SELECT id FROM search_filter WHERE id = \\$1 AND user_id = \\$2").
					WithArgs(*test.searchFilter.ID, *test.searchFilter.UserID).
					WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(test.searchFilter.ID))

				exec := dbmock.ExpectExec(
					"UPDATE search_filter SET name = \\$1, query = \\$2, with_pictures = \\$3, sort_by = \\$4, sort_dir = \\$5 WHERE id = \\$6 AND user_id = \\$7").
					WithArgs(
						test.searchFilter.Name,
						test.searchFilter.Query,
						test.searchFilter.WithPictures,
						test.searchFilter.SortBy,
						test.searchFilter.SortDir,
						test.searchFilter.ID,
						test.searchFilter.UserID)
				if test.dbError == nil {
					exec.WillReturnResult(driver.RowsAffected(1))

					dbmock.ExpectExec("DELETE FROM search_filter_field WHERE search_filter_id = \\$1").
						WithArgs(test.searchFilter.ID).
						WillReturnResult(driver.RowsAffected(1))
					for _, field := range test.searchFilter.Fields {
						dbmock.ExpectExec("INSERT INTO search_filter_field \\(search_filter_id, field_name\\) VALUES \\(\\$1, \\$2\\)").
							WithArgs(test.searchFilter.ID, field).
							WillReturnResult(driver.RowsAffected(1))
					}

					dbmock.ExpectExec("DELETE FROM search_filter_state WHERE search_filter_id = \\$1").
						WithArgs(test.searchFilter.ID).
						WillReturnResult(driver.RowsAffected(1))
					for _, state := range test.searchFilter.States {
						dbmock.ExpectExec("INSERT INTO search_filter_state \\(search_filter_id, state\\) VALUES \\(\\$1, \\$2\\)").
							WithArgs(test.searchFilter.ID, state).
							WillReturnResult(driver.RowsAffected(1))
					}

					dbmock.ExpectExec("DELETE FROM search_filter_tag WHERE search_filter_id = \\$1").
						WithArgs(test.searchFilter.ID).
						WillReturnResult(driver.RowsAffected(1))
					for _, tag := range test.searchFilter.Tags {
						dbmock.ExpectExec("INSERT INTO search_filter_tag \\(search_filter_id, tag\\) VALUES \\(\\$1, \\$2\\)").
							WithArgs(test.searchFilter.ID, tag).
							WillReturnResult(driver.RowsAffected(1))
					}

					dbmock.ExpectCommit()
				} else {
					exec.WillReturnError(test.dbError)
					dbmock.ExpectRollback()
				}
			} else {
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.UserSearchFilters().Update(t.Context(), test.searchFilter)

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

func Test_UserSearchFilter_Delete(t *testing.T) {
	type testArgs struct {
		userID        int64
		filterID      int64
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

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("DELETE FROM search_filter WHERE id = \\$1 AND user_id = \\$2").
				WithArgs(test.filterID, test.userID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))
				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.UserSearchFilters().Delete(t.Context(), test.userID, test.filterID)

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

func Test_UserSearchFilter_List(t *testing.T) {
	type testArgs struct {
		userID         int64
		expectedResult []models.SavedSearchFilterCompact
		dbError        error
		expectedError  error
	}

	// Arrange
	tests := []testArgs{
		{1, []models.SavedSearchFilterCompact{
			{
				ID:     utils.GetPtr[int64](1),
				Name:   "Filter 1",
				UserID: utils.GetPtr[int64](1),
			},
			{
				ID:     utils.GetPtr[int64](2),
				Name:   "Filter 2",
				UserID: utils.GetPtr[int64](1),
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

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT id, user_id, name FROM search_filter WHERE user_id = \\$1 ORDER BY name ASC")
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "name", "user_id"})
				for _, filter := range test.expectedResult {
					rows.AddRow(filter.ID, filter.Name, filter.UserID)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			result, err := sut.UserSearchFilters().List(t.Context(), test.userID)

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
					for i, user := range test.expectedResult {
						if user.Name != (*result)[i].Name {
							t.Errorf("names don't match, expected: %s, received: %s", user.Name, (*result)[i].Name)
						}
					}
				}
			}
		})
	}
}
