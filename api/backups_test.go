package api

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"mime/multipart"
	"testing"
	"testing/fstest"
	"time"

	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
)

func TestCreateBackup(t *testing.T) {
	tests := []struct {
		name           string
		body           *multipart.Reader
		setupMocks     func(*fileaccessmock.MockDriver, *db.MockBackupDriver, *bytes.Buffer)
		expectError    bool
		expectResponse any
	}{
		{
			name: "Success - generate from database with nil body",
			body: nil,
			setupMocks: func(mockFS *fileaccessmock.MockDriver, mockBackupDriver *db.MockBackupDriver, _ *bytes.Buffer) {
				mockBackupDriver.EXPECT().Export(gomock.Any()).Return(&models.BackupData{}, nil)

				mapFS := fstest.MapFS{
					"foo.zip": &fstest.MapFile{
						Data:    []byte{},
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}
				mockWriter := bytes.NewBuffer([]byte{})
				mockFS.EXPECT().Create(gomock.Any()).Return(bufferCloser{mockWriter}, nil)
				mockFS.EXPECT().Stat(gomock.Any()).Return(createMockFileInfo(int64(mockWriter.Len())), nil).MinTimes(1)
				mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("foo.zip"))
			},
			expectError:    false,
			expectResponse: CreateBackup201Response{},
		},
		{
			name: "Success - upload backup file with multipart body",
			body: createMultipartBackupReader("test-backup"),
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ *db.MockBackupDriver, backupZip *bytes.Buffer) {
				mapFS := fstest.MapFS{
					"foo.zip": &fstest.MapFile{
						Data:    backupZip.Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}

				gomock.InOrder(
					// Save the uploaded file
					mockFS.EXPECT().Save(gomock.Any(), gomock.Any()).Return(nil),
					// Stat the file to verify it exists
					mockFS.EXPECT().Stat(gomock.Any()).Return(createMockFileInfo(int64(backupZip.Len())), nil),
					// Open the file to validate it's a valid backup
					mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("foo.zip")),
				)
			},
			expectError:    false,
			expectResponse: CreateBackup201Response{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockFS := fileaccessmock.NewMockDriver(ctrl)
			mockDB := db.NewMockDriver(ctrl)
			mockBackupDriver := db.NewMockBackupDriver(ctrl)
			mockDB.EXPECT().Backups().Return(mockBackupDriver).AnyTimes()

			backupZip := createTestBackupZip("test-backup")
			tt.setupMocks(mockFS, mockBackupDriver, backupZip)

			api := apiHandler{
				secureKeys: []string{},
				db:         mockDB,
				fs:         mockFS,
			}

			ctx := context.Background()
			request := CreateBackupRequestObject{
				Body: tt.body,
			}

			// Act
			resp, err := api.CreateBackup(ctx, request)

			// Assert
			if (err != nil) != tt.expectError {
				t.Errorf("expected error: %v, got error: %v", tt.expectError, err)
			}

			if resp == nil {
				t.Fatal("response is nil")
			}

			_, ok := resp.(CreateBackup201Response)
			if !ok {
				t.Errorf("expected CreateBackup201Response, got %T", resp)
			}
		})
	}
}

func TestGetBackups(t *testing.T) {
	tests := []struct {
		name          string
		listErr       error
		setupMocks    func(*fileaccessmock.MockDriver, error)
		expectError   bool
		expectedCount int
	}{
		{
			name:    "Success - no backups",
			listErr: nil,
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ error) {
				mockFS.EXPECT().List(fileaccess.BackupDirectoryName).Return([]fs.DirEntry{}, nil)
			},
			expectError:   false,
			expectedCount: 0,
		},
		{
			name:    "Success - multiple backups",
			listErr: nil,
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ error) {
				files := map[string]*fstest.MapFile{
					"backup1.zip": {
						Data:    createTestBackupZip("backup1").Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
					"backup2.zip": {
						Data:    createTestBackupZip("backup2").Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
					"backup3.zip": {
						Data:    createTestBackupZip("backup3").Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}
				mapFS := fstest.MapFS(files)

				mockFS.EXPECT().List(fileaccess.BackupDirectoryName).Return(createMockDirEntries(files), nil)

				gomock.InOrder(
					mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("backup1.zip")),
					mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("backup2.zip")),
					mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("backup3.zip")),
				)
			},
			expectError:   false,
			expectedCount: 3,
		},
		{
			name:    "Success - skip files with stat errors",
			listErr: nil,
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ error) {
				files := map[string]*fstest.MapFile{
					"valid.zip": {
						Data:    createTestBackupZip("valid").Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}
				mapFS := fstest.MapFS(files)

				backupFiles := createMockDirEntries(files)
				// Now add an invalid entry
				backupFiles = append(backupFiles, &mockDirEntry{name: "invalid.zip", isDir: false, size: 10, infoErr: errors.New("stat error")})

				mockFS.EXPECT().List(fileaccess.BackupDirectoryName).Return(backupFiles, nil)
				mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("valid.zip"))
			},
			expectError:   false,
			expectedCount: 1,
		},
		{
			name:    "Success - skip files with read errors",
			listErr: nil,
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ error) {
				files := map[string]*fstest.MapFile{
					"valid.zip": {
						Data:    createTestBackupZip("valid").Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
					"corrupted.zip": {
						Data:    []byte("invalid zip data"),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}
				mapFS := fstest.MapFS(files)

				mockFS.EXPECT().List(fileaccess.BackupDirectoryName).Return(createMockDirEntries(files), nil)
				gomock.InOrder(
					mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("valid.zip")),
					mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("corrupted.zip")),
				)
			},
			expectError:   false,
			expectedCount: 1,
		},
		{
			name:    "Error - list operation fails",
			listErr: errors.New("permission denied"),
			setupMocks: func(mockFS *fileaccessmock.MockDriver, listErr error) {
				mockFS.EXPECT().List(fileaccess.BackupDirectoryName).Return(nil, listErr)
			},
			expectError:   true,
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockFS := fileaccessmock.NewMockDriver(ctrl)
			mockDB := db.NewMockDriver(ctrl)

			tt.setupMocks(mockFS, tt.listErr)

			api := apiHandler{
				secureKeys: []string{},
				db:         mockDB,
				fs:         mockFS,
			}

			ctx := context.Background()
			request := GetBackupsRequestObject{}

			// Act
			resp, err := api.GetBackups(ctx, request)

			// Assert
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if resp == nil {
				t.Fatal("response is nil")
			}

			if !tt.expectError {
				backups, ok := resp.(GetBackups200JSONResponse)
				if !ok {
					t.Errorf("expected GetBackups200JSONResponse, got %T", resp)
					return
				}

				if len(backups) != tt.expectedCount {
					t.Errorf("expected %d backups, got %d", tt.expectedCount, len(backups))
				}
			} else {
				_, ok := resp.(GetBackups500Response)
				if !ok {
					t.Errorf("expected GetBackups500Response, got %T", resp)
				}
			}
		})
	}
}

func TestRestoreFromBackup(t *testing.T) {
	tests := []struct {
		name        string
		fileName    string
		setupMocks  func(*fileaccessmock.MockDriver, *db.MockBackupDriver)
		expectError bool
	}{
		{
			name:     "Success - restore valid backup",
			fileName: "test-backup.zip",
			setupMocks: func(mockFS *fileaccessmock.MockDriver, mockBackupDriver *db.MockBackupDriver) {
				backupZip := createTestBackupZip("test-backup")
				mapFS := fstest.MapFS{
					"test-backup.zip": &fstest.MapFile{
						Data:    backupZip.Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}

				gomock.InOrder(
					// Stat the file
					mockFS.EXPECT().Stat(gomock.Any()).Return(createMockFileInfo(int64(backupZip.Len())), nil),
					// Open the file
					mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("test-backup.zip")),
					// CopyDirectoryFromZip expects this method, but it's internal to fileaccess
					// so we just expect the Import to be called
					mockBackupDriver.EXPECT().Import(gomock.Any(), gomock.Any()).Return(nil),
				)
			},
			expectError: false,
		},
		{
			name:     "Error - file not found",
			fileName: "nonexistent.zip",
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ *db.MockBackupDriver) {
				mockFS.EXPECT().Stat(gomock.Any()).Return(nil, errors.New("file not found"))
			},
			expectError: true,
		},
		{
			name:     "Error - target is a directory",
			fileName: "backups",
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ *db.MockBackupDriver) {
				dirInfo := &mockFileInfo{
					name:  "backups",
					size:  0,
					isDir: true,
				}
				mockFS.EXPECT().Stat(gomock.Any()).Return(dirInfo, nil)
			},
			expectError: true,
		},
		{
			name:     "Error - failed to open file",
			fileName: "test-backup.zip",
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ *db.MockBackupDriver) {
				mockFS.EXPECT().Stat(gomock.Any()).Return(createMockFileInfo(1024), nil)
				mockFS.EXPECT().Open(gomock.Any()).Return(nil, errors.New("permission denied"))
			},
			expectError: true,
		},
		{
			name:     "Error - invalid zip file",
			fileName: "corrupted.zip",
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ *db.MockBackupDriver) {
				mapFS := fstest.MapFS{
					"corrupted.zip": &fstest.MapFile{
						Data:    []byte("not a valid zip file"),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}

				mockFS.EXPECT().Stat(gomock.Any()).Return(createMockFileInfo(20), nil)
				mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("corrupted.zip"))
			},
			expectError: true,
		},
		{
			name:     "Error - missing metadata in backup",
			fileName: "incomplete.zip",
			setupMocks: func(mockFS *fileaccessmock.MockDriver, _ *db.MockBackupDriver) {
				// Create a zip without metadata
				buf := new(bytes.Buffer)
				zw := zip.NewWriter(buf)
				w, _ := zw.Create("database.json")
				_, _ = w.Write([]byte("{}"))
				_ = zw.Close()

				mapFS := fstest.MapFS{
					"incomplete.zip": &fstest.MapFile{
						Data:    buf.Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}

				mockFS.EXPECT().Stat(gomock.Any()).Return(createMockFileInfo(int64(buf.Len())), nil)
				mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("incomplete.zip"))
			},
			expectError: true,
		},
		{
			name:     "Error - failed to import backup data",
			fileName: "test-backup.zip",
			setupMocks: func(mockFS *fileaccessmock.MockDriver, mockBackupDriver *db.MockBackupDriver) {
				backupZip := createTestBackupZip("test-backup")
				mapFS := fstest.MapFS{
					"test-backup.zip": &fstest.MapFile{
						Data:    backupZip.Bytes(),
						Mode:    fs.ModeAppend,
						ModTime: time.Now(),
					},
				}

				gomock.InOrder(
					mockFS.EXPECT().Stat(gomock.Any()).Return(createMockFileInfo(int64(backupZip.Len())), nil),
					mockFS.EXPECT().Open(gomock.Any()).Return(mapFS.Open("test-backup.zip")),
					mockBackupDriver.EXPECT().Import(gomock.Any(), gomock.Any()).Return(errors.New("import failed")),
				)
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockFS := fileaccessmock.NewMockDriver(ctrl)
			mockDB := db.NewMockDriver(ctrl)
			mockBackupDriver := db.NewMockBackupDriver(ctrl)
			mockDB.EXPECT().Backups().Return(mockBackupDriver).AnyTimes()

			tt.setupMocks(mockFS, mockBackupDriver)

			api := apiHandler{
				secureKeys: []string{},
				db:         mockDB,
				fs:         mockFS,
			}

			ctx := context.Background()
			request := RestoreFromBackupRequestObject{
				FileName: tt.fileName,
			}

			// Act
			resp, err := api.RestoreFromBackup(ctx, request)

			// Assert
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if resp == nil {
				t.Fatal("response is nil")
			}

			if !tt.expectError {
				_, ok := resp.(RestoreFromBackup204Response)
				if !ok {
					t.Errorf("expected RestoreFromBackup204Response, got %T", resp)
				}
			} else {
				_, ok := resp.(RestoreFromBackup400Response)
				if !ok {
					t.Errorf("expected RestoreFromBackup400Response, got %T", resp)
				}
			}
		})
	}
}

func TestDeleteBackup(t *testing.T) {
	tests := []struct {
		name        string
		fileName    string
		deleteErr   error
		expectError bool
	}{
		{
			name:        "Success - delete backup file",
			fileName:    "test-backup.zip",
			deleteErr:   nil,
			expectError: false,
		},
		{
			name:        "Success - delete backup with generated name",
			fileName:    "gomp-backup-2024-01-15T10-30-45.000Z.zip",
			deleteErr:   nil,
			expectError: false,
		},
		{
			name:        "Error - file not found",
			fileName:    "nonexistent-backup.zip",
			deleteErr:   errors.New("file not found"),
			expectError: true,
		},
		{
			name:        "Error - permission denied",
			fileName:    "protected-backup.zip",
			deleteErr:   errors.New("permission denied"),
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockFS := fileaccessmock.NewMockDriver(ctrl)
			mockDB := db.NewMockDriver(ctrl)

			mockFS.EXPECT().Delete(gomock.Any()).Return(tt.deleteErr)

			api := apiHandler{
				secureKeys: []string{},
				db:         mockDB,
				fs:         mockFS,
			}

			ctx := context.Background()
			request := DeleteBackupRequestObject{
				FileName: tt.fileName,
			}

			// Act
			resp, err := api.DeleteBackup(ctx, request)

			// Assert
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if resp == nil {
				t.Fatal("response is nil")
			}
			if !tt.expectError {
				_, ok := resp.(DeleteBackup204Response)
				if !ok {
					t.Errorf("expected DeleteBackup204Response, got %T", resp)
				}
			} else {
				_, ok := resp.(DeleteBackup400Response)
				if !ok {
					t.Errorf("expected DeleteBackup400Response, got %T", resp)
				}
			}
		})
	}
}

type bufferCloser struct {
	buffer *bytes.Buffer
}

func (b bufferCloser) Write(p []byte) (n int, err error) {
	return b.buffer.Write(p)
}

func (bufferCloser) Close() error {
	return nil
}

// Helper functions for testing

func createTestBackupZip(name string) *bytes.Buffer {
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	// Write metadata
	metadata := models.BackupMetadata{
		Name:    name,
		Version: "1.0.0",
	}
	metadataJSON, _ := json.MarshalIndent(metadata, "", "  ")
	w, _ := zw.Create("metadata.json")
	_, _ = w.Write(metadataJSON)

	// Write empty database data
	databaseData := models.BackupData{}
	databaseJSON, _ := json.MarshalIndent(databaseData, "", "  ")
	w, _ = zw.Create("database.json")
	_, _ = w.Write(databaseJSON)

	_ = zw.Close()
	return buf
}

func createMultipartBackupReader(name string) *multipart.Reader {
	backupZip := createTestBackupZip(name)

	body := new(bytes.Buffer)
	w := multipart.NewWriter(body)
	part, _ := w.CreateFormFile("file", "backup.zip")
	_, _ = io.Copy(part, backupZip)
	_ = w.Close()

	return multipart.NewReader(body, w.Boundary())
}

type mockFileInfo struct {
	name  string
	size  int64
	isDir bool
}

func (*mockFileInfo) Name() string       { return "test.zip" }
func (m *mockFileInfo) Size() int64      { return m.size }
func (*mockFileInfo) Mode() fs.FileMode  { return 0644 }
func (*mockFileInfo) ModTime() time.Time { return time.Now() }
func (m *mockFileInfo) IsDir() bool      { return m.isDir }
func (*mockFileInfo) Sys() any           { return nil }

func createMockFileInfo(size int64) fs.FileInfo {
	return &mockFileInfo{
		name:  "test.zip",
		size:  size,
		isDir: false,
	}
}

type mockDirEntry struct {
	name    string
	isDir   bool
	size    int64
	infoErr error
}

func (m *mockDirEntry) Name() string    { return m.name }
func (m *mockDirEntry) IsDir() bool     { return m.isDir }
func (*mockDirEntry) Type() fs.FileMode { return 0644 }
func (m *mockDirEntry) Info() (fs.FileInfo, error) {
	if m.infoErr != nil {
		return nil, m.infoErr
	}
	return &mockFileInfo{name: m.name, size: m.size, isDir: m.isDir}, nil
}

func createMockDirEntries(files map[string]*fstest.MapFile) []fs.DirEntry {
	entries := make([]fs.DirEntry, 0, len(files))
	for name, file := range files {
		entries = append(entries, createMockDirEntry(name, file))
	}
	return entries
}

func createMockDirEntry(name string, file *fstest.MapFile) fs.DirEntry {
	return &mockDirEntry{
		name:    name,
		isDir:   file.Mode.IsDir(),
		size:    int64(len(file.Data)),
		infoErr: nil,
	}
}
