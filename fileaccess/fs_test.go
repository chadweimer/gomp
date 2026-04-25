package fileaccess

import (
	"errors"
	"io/fs"
	"testing"
	"testing/fstest"
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
