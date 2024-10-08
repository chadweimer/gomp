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
	"github.com/chadweimer/gomp/utils"
	"github.com/golang/mock/gomock"
	"golang.org/x/crypto/bcrypt"
)

func Test_User_Create(t *testing.T) {
	type testArgs struct {
		username      string
		password      string
		accessLevel   models.AccessLevel
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{"user@example.com", "password", models.Editor, nil, nil},
		{"admin@example.com", "password", models.Admin, nil, nil},
		{"", "", models.Viewer, sql.ErrNoRows, ErrNotFound},
		{"", "", models.Viewer, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
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
			err := sut.Users().Create(user, test.password)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if err == nil && *user.ID != expectedID {
				t.Errorf("expected note id %d, received %d", expectedID, *user.ID)
			}
		})
	}
}

func Test_User_Read(t *testing.T) {
	type testArgs struct {
		userID        int64
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

			sut, dbmock := getMockDb(t)
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
			user, err := sut.Users().Read(test.userID)

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

			sut, dbmock := getMockDb(t)
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
			user, err := sut.Users().Authenticate(test.username, test.attemptedPassword)

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
		userID        int64
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

			sut, dbmock := getMockDb(t)
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
			err := sut.Users().Update(user)

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
		userID            int64
		currentPassword   string
		attemptedPassword string
		newPassword       string
		dbError           error
		expectedError     error
	}

	// Arrange
	tests := []testArgs{
		{1, "password", "password", "newpassword", nil, nil},
		{1, "password", "wrongpassword", "newpassword", nil, ErrAuthenticationFailed},
		{0, "password", "password", "newpassword", sql.ErrNoRows, ErrNotFound},
		{0, "password", "password", "newpassword", sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
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
			err = sut.Users().UpdatePassword(test.userID, test.attemptedPassword, test.newPassword)

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

func Test_User_ReadSettings(t *testing.T) {
	type testArgs struct {
		userID        int64
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT \\* FROM app_user_settings WHERE user_id = \\$1").WithArgs(test.userID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"user_id", "home_title", "home_image_url"}).
					AddRow(test.userID, "My Home Title", "https://example.com/my-image.jpg")
				query.WillReturnRows(rows)

				dbmock.ExpectQuery("SELECT tag FROM app_user_favorite_tag WHERE user_id = \\$1 ORDER BY tag ASC").
					WithArgs(test.userID).
					WillReturnRows(sqlmock.NewRows([]string{"tag"}).AddRow("A").AddRow("B"))
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			userSettings, err := sut.Users().ReadSettings(test.userID)

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			}
			if err := dbmock.ExpectationsWereMet(); err != nil {
				t.Errorf("there were unfulfilled expectations: %s", err)
			}
			if test.expectedError == nil && *userSettings.UserID != test.userID {
				t.Errorf("ids don't match, expected: %d, received: %d", test.userID, *userSettings.UserID)
			}
		})
	}
}

func Test_User_UpdateSettings(t *testing.T) {
	type testArgs struct {
		userID        int64
		homeTitle     string
		homeImageURL  string
		favoriteTags  []string
		dbError       error
		expectedError error
	}

	// Arrange
	tests := []testArgs{
		{1, "My Home Title", "https://example.com/my-image.jpg", []string{"A", "B"}, nil, nil},
		{0, "", "", []string{"A", "B"}, sql.ErrNoRows, ErrNotFound},
		{0, "", "", []string{"A", "B"}, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			userSettings := &models.UserSettings{
				UserID:       &test.userID,
				HomeTitle:    &test.homeTitle,
				HomeImageURL: &test.homeImageURL,
				FavoriteTags: test.favoriteTags,
			}

			dbmock.ExpectBegin()
			exec := dbmock.ExpectExec("UPDATE app_user_settings SET home_title = \\$1, home_image_url = \\$2 WHERE user_id = \\$3").
				WithArgs(userSettings.HomeTitle, userSettings.HomeImageURL, userSettings.UserID)
			if test.dbError == nil {
				exec.WillReturnResult(driver.RowsAffected(1))

				dbmock.ExpectExec("DELETE FROM app_user_favorite_tag WHERE user_id = \\$1").
					WithArgs(test.userID).
					WillReturnResult(driver.RowsAffected(1))

				for _, tag := range test.favoriteTags {
					dbmock.ExpectExec("INSERT INTO app_user_favorite_tag \\(user_id, tag\\) VALUES \\(\\$1, \\$2\\)").
						WithArgs(test.userID, tag).
						WillReturnResult(driver.RowsAffected(1))
				}

				dbmock.ExpectCommit()
			} else {
				exec.WillReturnError(test.dbError)
				dbmock.ExpectRollback()
			}

			// Act
			err := sut.Users().UpdateSettings(userSettings)

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

func Test_User_Delete(t *testing.T) {
	type testArgs struct {
		userID        int64
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

			sut, dbmock := getMockDb(t)
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
			err := sut.Users().Delete(test.userID)

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
		expectedResult []models.User
		dbError        error
		expectedError  error
	}

	// Arrange
	now := time.Now()
	tests := []testArgs{
		{[]models.User{
			{
				ID:          utils.GetPtr[int64](1),
				Username:    "user@example.com",
				AccessLevel: models.Editor,
				CreatedAt:   &now,
				ModifiedAt:  &now,
			},
			{
				ID:          utils.GetPtr[int64](2),
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

			sut, dbmock := getMockDb(t)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT id, username, access_level, created_at, modified_at FROM app_user ORDER BY username ASC")
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"id", "username", "access_level", "created_at", "modified_at"})
				for _, user := range test.expectedResult {
					rows.AddRow(user.ID, user.Username, user.AccessLevel, user.CreatedAt, user.ModifiedAt)
				}
				query.WillReturnRows(rows)
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			result, err := sut.Users().List()

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
						if user.Username != (*result)[i].Username {
							t.Errorf("names don't match, expected: %s, received: %s", user.Username, (*result)[i].Username)
						}
					}
				}
			}
		})
	}
}

func Test_User_CreateSearchFilter(t *testing.T) {
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
				Tags:         []string{"A", "B"},
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

			sut, dbmock := getMockDb(t)
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
			err := sut.Users().CreateSearchFilter(test.searchFilter)

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

func Test_User_ReadSearchFilter(t *testing.T) {
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

			sut, dbmock := getMockDb(t)
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
			_, err := sut.Users().ReadSearchFilter(test.userID, test.filterID)

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

func Test_User_UpdateSearchFilter(t *testing.T) {
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
				Tags:         []string{"A", "B"},
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

			sut, dbmock := getMockDb(t)
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
			err := sut.Users().UpdateSearchFilter(test.searchFilter)

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

func Test_User_DeleteSearchFilter(t *testing.T) {
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

			sut, dbmock := getMockDb(t)
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
			err := sut.Users().DeleteSearchFilter(test.userID, test.filterID)

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

func Test_User_ListSearchFilters(t *testing.T) {
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

			sut, dbmock := getMockDb(t)
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
			result, err := sut.Users().ListSearchFilters(test.userID)

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

type passwordHashArgument string

func (p passwordHashArgument) Match(value driver.Value) bool {
	valueBytes, ok := value.([]byte)
	if !ok {
		return false
	}

	return verifyPassword(valueBytes, string(p))
}
