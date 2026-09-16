package cmds

import (
	"database/sql"
	"errors"
	"testing"

	"github.com/chadweimer/gomp/config"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/golang-migrate/migrate/v4"
	"github.com/urfave/cli/v3"
	"go.uber.org/mock/gomock"
)

func TestDatabaseCmd(t *testing.T) {
	got := databaseCmd(config.Config{})
	if got == nil {
		t.Error("databaseCmd() returned nil")
	}
}

func Test_migrateDatabaseUp(t *testing.T) {
	tests := []struct {
		name        string
		err         error
		expectedErr error
	}{
		{
			name:        "no error",
			err:         nil,
			expectedErr: nil,
		},
		{
			name:        "error",
			err:         sql.ErrConnDone,
			expectedErr: sql.ErrConnDone,
		},
		{
			name:        "no change",
			err:         migrate.ErrNoChange,
			expectedErr: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			dbDriver := dbmock.NewMockDriver(ctrl)
			dbDriver.EXPECT().MigrateUp().Return(tt.err)

			// Act
			gotErr := migrateDatabaseUp(t.Context(), nil, dbDriver)

			// Assert
			if !errors.Is(gotErr, tt.expectedErr) {
				t.Errorf("migrateDatabaseUp() = %v, expectedErr %v", gotErr, tt.expectedErr)
			}
		})
	}
}

func Test_migrateDatabaseDown(t *testing.T) {
	tests := []struct {
		name        string
		steps       uint16
		err         error
		expectedErr error
	}{
		{
			name:        "no error",
			steps:       3,
			err:         nil,
			expectedErr: nil,
		},
		{
			name:        "error",
			steps:       3,
			err:         sql.ErrConnDone,
			expectedErr: sql.ErrConnDone,
		},
		{
			name:        "no change",
			steps:       3,
			err:         migrate.ErrNoChange,
			expectedErr: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			dbDriver := dbmock.NewMockDriver(ctrl)
			dbDriver.EXPECT().MigrateDown(tt.steps).Return(tt.err)
			cmd := &cli.Command{
				Flags: []cli.Flag{
					&cli.Uint16Flag{
						Name:  "steps",
						Value: tt.steps,
					},
				},
			}

			// Act
			gotErr := migrateDatabaseDown(t.Context(), cmd, dbDriver)

			// Assert
			if !errors.Is(gotErr, tt.expectedErr) {
				t.Errorf("migrateDatabaseDown() = %v, expectedErr %v", gotErr, tt.expectedErr)
			}
		})
	}
}
