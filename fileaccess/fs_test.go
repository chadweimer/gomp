package fileaccess

import (
	"errors"
	"io/fs"
	"testing"
	"testing/fstest"

	"github.com/chadweimer/gomp/mocks/fileaccess"
	"go.uber.org/mock/gomock"
)

func TestOnlyFilesFileSystem_Open(t *testing.T) {
	testFS := fstest.MapFS{
		"file.txt": &fstest.MapFile{Data: []byte("content")},
		"dir":      &fstest.MapFile{Mode: fs.ModeDir},
		"dir/file": &fstest.MapFile{Data: []byte("nested")},
	}

	tests := []struct {
		name      string
		fs        fs.FS
		path      string
		wantErr   bool
		wantErrIs error
	}{
		{
			name:      "open file",
			fs:        testFS,
			path:      "file.txt",
			wantErr:   false,
			wantErrIs: nil,
		},
		{
			name:      "open directory returns permission error",
			fs:        testFS,
			path:      "dir",
			wantErr:   true,
			wantErrIs: fs.ErrPermission,
		},
		{
			name:      "path with leading slash",
			fs:        testFS,
			path:      "/file.txt",
			wantErr:   false,
			wantErrIs: nil,
		},
		{
			name:      "path with leading slash to directory",
			fs:        testFS,
			path:      "/dir",
			wantErr:   true,
			wantErrIs: fs.ErrPermission,
		},
		{
			name:      "nested file",
			fs:        testFS,
			path:      "dir/file",
			wantErr:   false,
			wantErrIs: nil,
		},
		{
			name:      "non-existent file",
			fs:        testFS,
			path:      "missing.txt",
			wantErr:   true,
			wantErrIs: fs.ErrNotExist,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jfs := &onlyFilesFileSystem{fs: tt.fs}
			file, err := jfs.Open(tt.path)

			if (err != nil) != tt.wantErr {
				t.Errorf("Open() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && tt.wantErrIs != nil {
				if !errors.Is(err, tt.wantErrIs) {
					t.Errorf("Open() error = %v, want error matching %v", err, tt.wantErrIs)
				}
			}

			if !tt.wantErr && file == nil {
				t.Error("Open() expected file, got nil")
			}

			if file != nil {
				file.Close()
			}
		})
	}
}

func Test_fileSystemDriver_Open(t *testing.T) {
	tests := []struct {
		name         string
		inputPath    string
		expectedPath string
		wantErr      bool
	}{
		{
			name:         "open existing file",
			inputPath:    "file.txt",
			expectedPath: "file.txt",
			wantErr:      false,
		},
		{
			name:         "open non-existent file",
			inputPath:    "missing.txt",
			expectedPath: "missing.txt",
			wantErr:      true,
		},
		{
			name:         "expect path to be cleaned",
			inputPath:    "dir/../file.txt",
			expectedPath: "file.txt",
			wantErr:      false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().Open(tt.expectedPath).DoAndReturn(func(path string) (fs.File, error) {
				if path != tt.expectedPath {
					t.Errorf("Open() called with path = %v, want %v", path, tt.expectedPath)
				}
				if path == "missing.txt" {
					return nil, fs.ErrNotExist
				}
				return nil, nil
			}).Times(1)
			u := fileSystemDriver{root}

			// Act
			_, gotErr := u.Open(tt.inputPath)

			// Assert
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("Open() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("Open() succeeded unexpectedly")
			}
		})
	}
}

func Test_fileSystemDriver_Create(t *testing.T) {
	tests := []struct {
		name             string
		inputPath        string
		expectedFilePath string
		expectedDirPath  string
		wantErr          bool
	}{
		{
			name:             "create file",
			inputPath:        "file.txt",
			expectedFilePath: "file.txt",
			expectedDirPath:  ".",
			wantErr:          false,
		},
		{
			name:             "expect path to be cleaned",
			inputPath:        "dir/../file.txt",
			expectedFilePath: "file.txt",
			expectedDirPath:  ".",
			wantErr:          false,
		},
		{
			name:             "create file in nested directory",
			inputPath:        "dir/subdir/file.txt",
			expectedFilePath: "dir/subdir/file.txt",
			expectedDirPath:  "dir/subdir",
			wantErr:          false,
		},
		{
			name:             "create file in root directory",
			inputPath:        "/newfile.txt",
			expectedFilePath: "/newfile.txt",
			expectedDirPath:  "/",
			wantErr:          false,
		},
		{
			name:             "error returned for failed directory creation",
			inputPath:        "fail/newfile.txt",
			expectedFilePath: "fail/newfile.txt",
			expectedDirPath:  "fail",
			wantErr:          true,
		},
		{
			name:             "error returned for failed file creation",
			inputPath:        "failfile.txt",
			expectedFilePath: "failfile.txt",
			expectedDirPath:  ".",
			wantErr:          true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().MkdirAll(tt.expectedDirPath, fs.FileMode(0750)).DoAndReturn(func(path string, _ fs.FileMode) error {
				if path != tt.expectedDirPath {
					t.Errorf("MkdirAll() called with path = %v, want %v", path, tt.expectedDirPath)
				}
				if path == "fail" {
					return fs.ErrPermission
				}
				return nil
			}).Times(1)
			if !tt.wantErr || tt.expectedDirPath != "fail" {
				root.EXPECT().Create(tt.expectedFilePath).DoAndReturn(func(path string) (fs.File, error) {
					if path != tt.expectedFilePath {
						t.Errorf("Create() called with path = %v, want %v", path, tt.expectedFilePath)
					}
					if path == "failfile.txt" {
						return nil, fs.ErrPermission
					}
					return nil, nil
				}).Times(1)
			}
			u := fileSystemDriver{root}

			// Act
			_, gotErr := u.Create(tt.inputPath)

			// Assert
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("Create() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("Create() succeeded unexpectedly")
			}
		})
	}
}

func Test_fileSystemDriver_Delete(t *testing.T) {
	tests := []struct {
		name         string
		inputPath    string
		expectedPath string
		wantErr      bool
	}{
		{
			name:         "delete existing file",
			inputPath:    "file.txt",
			expectedPath: "file.txt",
			wantErr:      false,
		},
		{
			name:         "delete non-existent file",
			inputPath:    "missing.txt",
			expectedPath: "missing.txt",
			wantErr:      true,
		},
		{
			name:         "expect path to be cleaned",
			inputPath:    "dir/../file.txt",
			expectedPath: "file.txt",
			wantErr:      false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().Remove(tt.expectedPath).DoAndReturn(func(path string) error {
				if path != tt.expectedPath {
					t.Errorf("Remove() called with path = %v, want %v", path, tt.expectedPath)
				}
				if path == "missing.txt" {
					return fs.ErrNotExist
				}
				return nil
			}).Times(1)

			u := fileSystemDriver{root}

			// Act
			gotErr := u.Delete(tt.inputPath)

			// Assert
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("Delete() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("Delete() succeeded unexpectedly")
			}
		})
	}
}

func Test_fileSystemDriver_DeleteAll(t *testing.T) {
	tests := []struct {
		name         string
		inputPath    string
		expectedPath string
		wantErr      bool
	}{
		{
			name:         "delete all in existing directory",
			inputPath:    "/dir",
			expectedPath: "/dir",
			wantErr:      false,
		},
		{
			name:         "delete all in non-existent directory",
			inputPath:    "/missing",
			expectedPath: "/missing",
			wantErr:      true,
		},
		{
			name:         "delete all in nested directory",
			inputPath:    "/dir/subdir",
			expectedPath: "/dir/subdir",
			wantErr:      false,
		},
		{
			name:         "expect path to be cleaned",
			inputPath:    "/dir/../dir/subdir",
			expectedPath: "/dir/subdir",
			wantErr:      false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().RemoveAll(tt.expectedPath).DoAndReturn(func(path string) error {
				if path != tt.expectedPath {
					t.Errorf("RemoveAll() called with path = %v, want %v", path, tt.expectedPath)
				}
				if path == "/missing" {
					return fs.ErrNotExist
				}
				return nil
			}).Times(1)
			u := fileSystemDriver{root}

			// Act
			gotErr := u.DeleteAll(tt.inputPath)

			// Assert
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("DeleteAll() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("DeleteAll() succeeded unexpectedly")
			}
		})
	}
}

func Test_fileSystemDriver_Stat(t *testing.T) {
	tests := []struct {
		name         string
		inputPath    string
		expectedPath string
		wantErr      bool
	}{
		{
			name:         "stat existing file",
			inputPath:    "file.txt",
			expectedPath: "file.txt",
			wantErr:      false,
		},
		{
			name:         "stat non-existent file",
			inputPath:    "missing.txt",
			expectedPath: "missing.txt",
			wantErr:      true,
		},
		{
			name:         "expect path to be cleaned",
			inputPath:    "dir/../file.txt",
			expectedPath: "file.txt",
			wantErr:      false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().Stat(tt.expectedPath).DoAndReturn(func(path string) (fs.FileInfo, error) {
				if path != tt.expectedPath {
					t.Errorf("Stat() called with path = %v, want %v", path, tt.expectedPath)
				}
				if path == "missing.txt" {
					return nil, fs.ErrNotExist
				}
				return nil, nil
			}).Times(1)
			u := fileSystemDriver{root}

			// Act
			_, gotErr := u.Stat(tt.inputPath)

			// Assert
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("Stat() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("Stat() succeeded unexpectedly")
			}
		})
	}
}
