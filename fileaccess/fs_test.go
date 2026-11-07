package fileaccess

import (
	"bytes"
	"errors"
	"io"
	"io/fs"
	"reflect"
	"testing"
	"testing/fstest"
	"time"

	"github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/samber/lo"
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

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			jfs := &onlyFilesFileSystem{fs: test.fs}
			file, err := jfs.Open(test.path)

			if (err != nil) != test.wantErr {
				t.Errorf("Open() error = %v, wantErr %v", err, test.wantErr)
				return
			}

			if test.wantErr && test.wantErrIs != nil {
				if !errors.Is(err, test.wantErrIs) {
					t.Errorf("Open() error = %v, want error matching %v", err, test.wantErrIs)
				}
			}

			if !test.wantErr && file == nil {
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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().Open(test.expectedPath).DoAndReturn(func(path string) (fs.File, error) {
				if path != test.expectedPath {
					t.Errorf("Open() called with path = %v, want %v", path, test.expectedPath)
				}
				if path == "missing.txt" {
					return nil, fs.ErrNotExist
				}
				return nil, nil
			}).Times(1)
			u := fileSystemDriver{root}

			// Act
			_, gotErr := u.Open(test.inputPath)

			// Assert
			if gotErr != nil {
				if !test.wantErr {
					t.Errorf("Open() failed: %v", gotErr)
				}
				return
			}
			if test.wantErr {
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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().MkdirAll(test.expectedDirPath, fs.FileMode(0750)).DoAndReturn(func(path string, _ fs.FileMode) error {
				if path != test.expectedDirPath {
					t.Errorf("MkdirAll() called with path = %v, want %v", path, test.expectedDirPath)
				}
				if path == "fail" {
					return fs.ErrPermission
				}
				return nil
			}).Times(1)
			if !test.wantErr || test.expectedDirPath != "fail" {
				root.EXPECT().Create(test.expectedFilePath).DoAndReturn(func(path string) (fs.File, error) {
					if path != test.expectedFilePath {
						t.Errorf("Create() called with path = %v, want %v", path, test.expectedFilePath)
					}
					if path == "failfile.txt" {
						return nil, fs.ErrPermission
					}
					return nil, nil
				}).Times(1)
			}
			u := fileSystemDriver{root}

			// Act
			_, gotErr := u.Create(test.inputPath)

			// Assert
			if gotErr != nil {
				if !test.wantErr {
					t.Errorf("Create() failed: %v", gotErr)
				}
				return
			}
			if test.wantErr {
				t.Fatal("Create() succeeded unexpectedly")
			}
		})
	}
}

func Test_fileSystemDriver_Save(t *testing.T) {
	tests := []struct {
		name            string
		filePath        string
		content         string
		expectedDirPath string
		want            string
	}{
		{
			name:            "save file successfully",
			filePath:        "dir/file.txt",
			content:         "file content",
			expectedDirPath: "dir",
			want:            "file content",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			buf := bytes.NewBuffer(nil)
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().MkdirAll(test.expectedDirPath, fs.FileMode(0750)).Return(nil).Times(1)
			root.EXPECT().Create(test.filePath).DoAndReturn(func(path string) (io.WriteCloser, error) {
				if path != test.filePath {
					t.Errorf("Create() called with path = %v, want %v", path, test.filePath)
				}

				return struct {
					io.Writer
					io.Closer
				}{
					Writer: buf,
					Closer: io.NopCloser(buf),
				}, nil
			}).Times(1)
			u := fileSystemDriver{root}

			// Act
			gotErr := u.Save(test.filePath, bytes.NewReader([]byte(test.content)))
			// Assert
			if gotErr != nil {
				t.Fatalf("Save() failed: %v", gotErr)
			}
			// Verify the content was written correctly
			gotContent := buf.String()
			if gotContent != test.want {
				t.Errorf("Save() wrote content = '%v', want '%v'", gotContent, test.want)
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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().Remove(test.expectedPath).DoAndReturn(func(path string) error {
				if path != test.expectedPath {
					t.Errorf("Remove() called with path = %v, want %v", path, test.expectedPath)
				}
				if path == "missing.txt" {
					return fs.ErrNotExist
				}
				return nil
			}).Times(1)

			u := fileSystemDriver{root}

			// Act
			gotErr := u.Delete(test.inputPath)

			// Assert
			if gotErr != nil {
				if !test.wantErr {
					t.Errorf("Delete() failed: %v", gotErr)
				}
				return
			}
			if test.wantErr {
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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().RemoveAll(test.expectedPath).DoAndReturn(func(path string) error {
				if path != test.expectedPath {
					t.Errorf("RemoveAll() called with path = %v, want %v", path, test.expectedPath)
				}
				if path == "/missing" {
					return fs.ErrNotExist
				}
				return nil
			}).Times(1)
			u := fileSystemDriver{root}

			// Act
			gotErr := u.DeleteAll(test.inputPath)

			// Assert
			if gotErr != nil {
				if !test.wantErr {
					t.Errorf("DeleteAll() failed: %v", gotErr)
				}
				return
			}
			if test.wantErr {
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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().Stat(test.expectedPath).DoAndReturn(func(path string) (fs.FileInfo, error) {
				if path != test.expectedPath {
					t.Errorf("Stat() called with path = %v, want %v", path, test.expectedPath)
				}
				if path == "missing.txt" {
					return nil, fs.ErrNotExist
				}
				return nil, nil
			}).Times(1)
			u := fileSystemDriver{root}

			// Act
			_, gotErr := u.Stat(test.inputPath)

			// Assert
			if gotErr != nil {
				if !test.wantErr {
					t.Errorf("Stat() failed: %v", gotErr)
				}
				return
			}
			if test.wantErr {
				t.Fatal("Stat() succeeded unexpectedly")
			}
		})
	}
}

func Test_fileSystemDriver_List(t *testing.T) {
	tests := []struct {
		name         string
		dirPath      string
		isDir        bool
		entries      []fs.DirEntry
		expectedPath string
		want         []string
		wantErr      bool
	}{
		{
			name:         "list empty directory",
			dirPath:      "dir",
			isDir:        true,
			entries:      []fs.DirEntry{},
			expectedPath: "dir",
			want:         []string{},
			wantErr:      false,
		},
		{
			name:         "expect path to be cleaned",
			dirPath:      "path/../dir",
			isDir:        true,
			entries:      []fs.DirEntry{},
			expectedPath: "dir",
			want:         []string{},
			wantErr:      false,
		},
		{
			name:         "list non-existent directory",
			dirPath:      "missing",
			isDir:        true,
			entries:      nil,
			expectedPath: "missing",
			want:         nil,
			wantErr:      true,
		},
		{
			name:    "list directory with files",
			dirPath: "dir",
			isDir:   true,
			entries: []fs.DirEntry{
				&testDirEntry{name: "file1.txt"},
				&testDirEntry{name: "file2.txt"},
			},
			expectedPath: "dir",
			want:         []string{"file1.txt", "file2.txt"},
			wantErr:      false,
		},
		{
			name:    "list directory with files and subdirectories",
			dirPath: "dir",
			isDir:   true,
			entries: []fs.DirEntry{
				&testDirEntry{name: "file1.txt"},
				&testDirEntry{name: "file2.txt"},
				&testDirEntry{name: "subdir", dir: true},
			},
			expectedPath: "dir",
			want:         []string{"file1.txt", "file2.txt"},
			wantErr:      false,
		},
		{
			name:         "not a directory",
			dirPath:      "file.txt",
			expectedPath: "file.txt",
			isDir:        false,
			want:         nil,
			wantErr:      true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			root := fileaccess.NewMockRootFS(ctrl)
			root.EXPECT().Open(test.expectedPath).DoAndReturn(func(name string) (fs.ReadDirFile, error) {
				if name != test.expectedPath {
					t.Errorf("Open() called with path = %v, want %v", name, test.expectedPath)
				}
				if name == "missing" {
					return nil, fs.ErrNotExist
				}
				return &testReadDirFile{
					name:    name,
					size:    0,
					mode:    0,
					isDir:   test.isDir,
					modTime: time.Now(),
					dirs:    test.entries,
				}, nil
			}).Times(1)
			u := fileSystemDriver{root}

			// Act
			got, gotErr := u.List(test.dirPath)

			// Assert
			if gotErr != nil {
				if !test.wantErr {
					t.Errorf("List() failed: %v", gotErr)
				}
				return
			}
			if test.wantErr {
				t.Fatal("List() succeeded unexpectedly")
			}

			gotNames := lo.Map(got, func(entry fs.DirEntry, _ int) string {
				return entry.Name()
			})
			if !reflect.DeepEqual(gotNames, test.want) {
				t.Errorf("List() = %v, want %v", gotNames, test.want)
			}
		})
	}
}

type testReadDirFile struct {
	name    string
	size    int64
	mode    fs.FileMode
	isDir   bool
	modTime time.Time
	dirs    []fs.DirEntry
}

func (t *testReadDirFile) Stat() (fs.FileInfo, error) {
	return &testFileInfo{
		name:    t.name,
		size:    t.size,
		mode:    t.mode,
		isDir:   t.isDir,
		modTime: t.modTime,
	}, nil
}

func (*testReadDirFile) Read(_ []byte) (int, error) {
	return 0, io.EOF
}

func (*testReadDirFile) Close() error {
	return nil
}

func (t *testReadDirFile) ReadDir(n int) ([]fs.DirEntry, error) {
	if n == 0 {
		return t.dirs, nil
	}
	return t.dirs[0:n], nil
}

type testFileInfo struct {
	name    string
	size    int64
	mode    fs.FileMode
	isDir   bool
	modTime time.Time
}

func (t *testFileInfo) Name() string {
	return t.name
}

func (t *testFileInfo) Size() int64 {
	return t.size
}

func (t *testFileInfo) Mode() fs.FileMode {
	return t.mode
}

func (t *testFileInfo) IsDir() bool {
	return t.isDir
}

func (t *testFileInfo) ModTime() time.Time {
	return t.modTime
}

func (*testFileInfo) Sys() any {
	return nil
}
