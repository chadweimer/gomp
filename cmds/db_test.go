package cmds

import (
	"bytes"
	"database/sql"
	"errors"
	"io"
	"testing"

	"github.com/chadweimer/gomp/config"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/models"
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

func Test_exportDatabase(t *testing.T) {
	tests := []struct {
		name        string
		backupData  *models.BackupData
		output      string
		indent      string
		dbErr       error
		createErr   error
		wantContent string
		wantErr     bool
	}{
		{
			name:        "empty",
			backupData:  &models.BackupData{},
			output:      "backup.json",
			indent:      "",
			wantContent: "[]\n",
		},
		{
			name: "content",
			backupData: &models.BackupData{
				models.TableData{
					TableName: "table1",
					Data: []models.RowData{
						{
							"column1": "value1",
							"column2": "value2",
						},
					},
				},
			},
			output:      "backup.json",
			indent:      "",
			wantContent: "[{\"tableName\":\"table1\",\"data\":[{\"column1\":\"value1\",\"column2\":\"value2\"}]}]\n",
		},
		{
			name: "indented",
			backupData: &models.BackupData{
				models.TableData{
					TableName: "table1",
					Data: []models.RowData{
						{
							"column1": "value1",
							"column2": "value2",
						},
					},
				},
			},
			output:      "backup.json",
			indent:      "  ",
			wantContent: "[\n  {\n    \"tableName\": \"table1\",\n    \"data\": [\n      {\n        \"column1\": \"value1\",\n        \"column2\": \"value2\"\n      }\n    ]\n  }\n]\n",
		},
		{
			name:    "db error",
			dbErr:   sql.ErrNoRows,
			wantErr: true,
		},
		{
			name:      "create error",
			createErr: io.ErrUnexpectedEOF,
			wantErr:   true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			buf := bytes.NewBuffer(nil)
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockDB := dbmock.NewMockDriver(ctrl)
			mockBackupDriver := dbmock.NewMockBackupDriver(ctrl)
			mockBackupDriver.EXPECT().Export(gomock.Any()).Return(test.backupData, test.dbErr).AnyTimes()
			mockDB.EXPECT().Backups().Return(mockBackupDriver).AnyTimes()
			creator := func(path string) (io.WriteCloser, error) {
				if path != test.output {
					t.Errorf("Create() called with path = %v, want %v", path, test.output)
				}

				return struct {
					io.Writer
					io.Closer
				}{
					Writer: buf,
					Closer: io.NopCloser(buf),
				}, test.createErr
			}

			// Act
			gotErr := exportDatabase(t.Context(), mockDB, creator, test.output, test.indent)

			// Assert
			if (gotErr != nil) != test.wantErr {
				t.Fatalf("exportDatabase() = %v, wantErr %v", gotErr, test.wantErr)
			}
			if gotContent := buf.String(); gotContent != test.wantContent {
				t.Errorf("exportDatabase() wrote = %v, want %v", gotContent, test.wantContent)
			}
		})
	}
}

func Test_importDatabase(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		content        string
		dbErr          error
		openErr        error
		wantBackupData *models.BackupData
		wantErr        bool
	}{
		{
			name:           "empty",
			input:          "backup.json",
			content:        "[]\n",
			wantBackupData: &models.BackupData{},
		},
		{
			name:    "content",
			input:   "backup.json",
			content: "[{\"tableName\":\"table1\",\"data\":[{\"column1\":\"value1\",\"column2\":\"value2\"}]}]\n",
			wantBackupData: &models.BackupData{
				models.TableData{
					TableName: "table1",
					Data: []models.RowData{
						{
							"column1": "value1",
							"column2": "value2",
						},
					},
				},
			},
		},
		{
			name:    "bad data",
			input:   "backup.json",
			content: "invalid json",
			wantErr: true,
		},
		{
			name:    "open error",
			input:   "backup.json",
			openErr: io.ErrUnexpectedEOF,
			wantErr: true,
		},
		{
			name:           "db error",
			input:          "backup.json",
			content:        "[]\n",
			wantBackupData: &models.BackupData{},
			dbErr:          sql.ErrNoRows,
			wantErr:        true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			buf := bytes.NewBufferString(test.content)
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockDB := dbmock.NewMockDriver(ctrl)
			mockBackupDriver := dbmock.NewMockBackupDriver(ctrl)
			mockBackupDriver.EXPECT().Import(gomock.Any(), test.wantBackupData).Return(test.dbErr).AnyTimes()
			mockDB.EXPECT().Backups().Return(mockBackupDriver).AnyTimes()
			opener := func(_ string) (io.ReadCloser, error) {
				return io.NopCloser(buf), test.openErr
			}

			// Act
			gotErr := importDatabase(t.Context(), mockDB, opener, test.input)

			// Assert
			if (gotErr != nil) != test.wantErr {
				t.Fatalf("importDatabase() = %v, wantErr %v", gotErr, test.wantErr)
			}
		})
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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			dbDriver := dbmock.NewMockDriver(ctrl)
			dbDriver.EXPECT().MigrateUp().Return(test.err)

			// Act
			gotErr := migrateDatabaseUp(t.Context(), nil, dbDriver)

			// Assert
			if !errors.Is(gotErr, test.expectedErr) {
				t.Errorf("migrateDatabaseUp() = %v, expectedErr %v", gotErr, test.expectedErr)
			}
		})
	}
}

func Test_migrateDatabaseDown(t *testing.T) {
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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			dbDriver := dbmock.NewMockDriver(ctrl)
			dbDriver.EXPECT().MigrateDown().Return(test.err)

			// Act
			gotErr := migrateDatabaseDown(t.Context(), nil, dbDriver)

			// Assert
			if !errors.Is(gotErr, test.expectedErr) {
				t.Errorf("migrateDatabaseDown() = %v, expectedErr %v", gotErr, test.expectedErr)
			}
		})
	}
}

func Test_migrateDatabaseSteps(t *testing.T) {
	tests := []struct {
		name        string
		steps       int
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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			dbDriver := dbmock.NewMockDriver(ctrl)
			dbDriver.EXPECT().MigrateSteps(test.steps).Return(test.err)
			cmd := &cli.Command{
				Flags: []cli.Flag{
					&cli.IntFlag{
						Name:  "steps",
						Value: test.steps,
					},
				},
			}

			// Act
			gotErr := migrateDatabaseSteps(t.Context(), cmd, dbDriver)

			// Assert
			if !errors.Is(gotErr, test.expectedErr) {
				t.Errorf("migrateDatabaseSteps() = %v, expectedErr %v", gotErr, test.expectedErr)
			}
		})
	}
}
