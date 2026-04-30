package db

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
)

func Test_UserSettings_Read(t *testing.T) {
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

			sut, dbmock := getMockDb(t, nil)
			defer sut.Close()

			query := dbmock.ExpectQuery("SELECT \\* FROM app_user_settings WHERE user_id = \\$1").WithArgs(test.userID)
			if test.dbError == nil {
				rows := sqlmock.NewRows([]string{"user_id", "home_title", "home_image_url"}).
					AddRow(test.userID, "My Home Title", "https://example.com/my-image.jpg")
				query.WillReturnRows(rows)

				dbmock.ExpectQuery("SELECT tag FROM app_user_favorite_tag WHERE user_id = \\$1 ORDER BY tag ASC").
					WithArgs(test.userID).
					WillReturnRows(sqlmock.NewRows([]string{"tag"}).AddRow("kid-friendly").AddRow("quick"))
			} else {
				query.WillReturnError(test.dbError)
			}

			// Act
			userSettings, err := sut.UserSettings().Read(t.Context(), test.userID)

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

func Test_UserSettings_Update(t *testing.T) {
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
		{1, "My Home Title", "https://example.com/my-image.jpg", []string{"quick", "kid-friendly"}, nil, nil},
		{0, "", "", []string{"quick", "kid-friendly"}, sql.ErrNoRows, ErrNotFound},
		{0, "", "", []string{"quick", "kid-friendly"}, sql.ErrConnDone, sql.ErrConnDone},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			sut, dbmock := getMockDb(t, nil)
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
			err := sut.UserSettings().Update(t.Context(), userSettings)

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
