package fileaccess

import (
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"testing"
	"testing/fstest"

	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"go.uber.org/mock/gomock"
)

func TestCreateZip(t *testing.T) {
	tests := []struct {
		name              string
		writeContent      func(*zip.Writer) error
		wantErr           bool
		wantContentLength int
	}{
		{
			name: "Success - empty zip",
			writeContent: func(_ *zip.Writer) error {
				return nil
			},
			wantErr:           false,
			wantContentLength: 22,
		},
		{
			name: "Success - with file",
			writeContent: func(zw *zip.Writer) error {
				w, err := zw.Create("test.txt")
				if err != nil {
					return err
				}
				_, err = w.Write([]byte("hello"))
				return err
			},
			wantErr:           false,
			wantContentLength: 142,
		},
		{
			name: "Error - writeContent returns error",
			writeContent: func(_ *zip.Writer) error {
				return errors.New("write error")
			},
			wantErr: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			buf := new(bytes.Buffer)
			err := CreateZip(buf, test.writeContent)

			if (err != nil) != test.wantErr {
				t.Errorf("CreateZip() error = %v, wantErr %v", err, test.wantErr)
			}

			if !test.wantErr {
				if buf.Len() != test.wantContentLength {
					t.Errorf("unexpected zip content length: got %d, want %d", buf.Len(), test.wantContentLength)
				}
			}
		})
	}
}

func TestReadZip(t *testing.T) {
	// Create a valid zip for testing
	zipBuf := new(bytes.Buffer)
	zw := zip.NewWriter(zipBuf)
	w, _ := zw.Create("test.txt")
	if _, err := w.Write([]byte("hello")); err != nil {
		t.Fatalf("failed to write to zip: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("failed to close zip writer: %v", err)
	}
	validZipData := zipBuf.Bytes()

	tests := []struct {
		name        string
		reader      io.Reader
		size        int64
		readContent func(*zip.Reader) error
		wantErr     bool
	}{
		{
			name:   "Success - read from valid zip",
			reader: bytes.NewReader(validZipData),
			size:   int64(len(validZipData)),
			readContent: func(zr *zip.Reader) error {
				if len(zr.File) != 1 {
					return fmt.Errorf("unexpected file count: got %d, want 1", len(zr.File))
				}
				return nil
			},
			wantErr: false,
		},
		{
			name:   "Error - invalid zip data",
			reader: bytes.NewReader([]byte("not a zip")),
			size:   9,
			readContent: func(_ *zip.Reader) error {
				return nil
			},
			wantErr: true,
		},
		{
			name:   "Error - readContent returns error",
			reader: bytes.NewReader(validZipData),
			size:   int64(len(validZipData)),
			readContent: func(_ *zip.Reader) error {
				return errors.New("read error")
			},
			wantErr: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := ReadZip(test.reader, test.size, test.readContent)
			if (err != nil) != test.wantErr {
				t.Errorf("ReadZip() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

func TestWriteFileToZip(t *testing.T) {
	tests := []struct {
		name     string
		fileName string
		content  []byte
		wantErr  bool
	}{
		{
			name:     "Success - write simple file",
			fileName: "test.txt",
			content:  []byte("hello world"),
			wantErr:  false,
		},
		{
			name:     "Success - write empty file",
			fileName: "empty.txt",
			content:  []byte{},
			wantErr:  false,
		},
		{
			name:     "Success - write with nested path",
			fileName: "dir/subdir/file.txt",
			content:  []byte("nested"),
			wantErr:  false,
		},
		{
			name:     "Success - write large file",
			fileName: "large.bin",
			content:  bytes.Repeat([]byte("x"), 1024*1024),
			wantErr:  false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			buf := new(bytes.Buffer)
			zw := zip.NewWriter(buf)
			defer zw.Close()

			err := WriteFileToZip(test.fileName, bytes.NewReader(test.content), zw)
			if (err != nil) != test.wantErr {
				t.Errorf("WriteFileToZip() error = %v, wantErr %v", err, test.wantErr)
				return
			}

			if !test.wantErr {
				_ = zw.Close()
				// Verify the file was written
				zr, _ := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
				found := false
				for _, f := range zr.File {
					if f.Name == test.fileName {
						found = true
						rc, _ := f.Open()
						data, _ := io.ReadAll(rc)
						_ = rc.Close()
						if bytes.Equal(data, test.content) {
							break
						}
						t.Fatal("file content mismatch")
					}
				}
				if !found {
					t.Errorf("file %s not found in zip", test.fileName)
				}
			}
		})
	}
}

func TestCopyDirectoryToZip(t *testing.T) {
	tests := []struct {
		name    string
		fs      fs.FS
		srcPath string
		setup   func(fs.FS) error
		verify  func(*testing.T, *zip.Reader)
		wantErr bool
	}{
		{
			name:    "Success - copy directory with files",
			fs:      createTestFS(),
			srcPath: "testdir",
			verify: func(t *testing.T, zr *zip.Reader) {
				expectedFiles := map[string]string{
					"testdir/file1.txt":        "content1",
					"testdir/file2.txt":        "content2",
					"testdir/subdir/file3.txt": "content3",
				}
				for _, f := range zr.File {
					if expected, ok := expectedFiles[f.Name]; ok {
						rc, _ := f.Open()
						data, _ := io.ReadAll(rc)
						_ = rc.Close()
						if string(data) != expected {
							t.Errorf("file %s content mismatch: got %q, want %q", f.Name, string(data), expected)
						}
					}
				}
			},
			wantErr: false,
		},
		{
			name:    "Success - copy non-existent directory (no-op)",
			fs:      createTestFS(),
			srcPath: "nonexistent",
			verify: func(t *testing.T, zr *zip.Reader) {
				if len(zr.File) != 0 {
					t.Errorf("expected no files, got %d", len(zr.File))
				}
			},
			wantErr: false,
		},
		{
			name:    "Error - fs.Stat returns other error",
			fs:      &errorFS{err: errors.New("permission denied")},
			srcPath: "testdir",
			wantErr: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			buf := new(bytes.Buffer)
			zw := zip.NewWriter(buf)

			err := CopyDirectoryToZip(test.fs, test.srcPath, zw)
			if (err != nil) != test.wantErr {
				t.Errorf("CopyDirectoryToZip() error = %v, wantErr %v", err, test.wantErr)
				return
			}

			if !test.wantErr && test.verify != nil {
				_ = zw.Close()
				zr, _ := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
				test.verify(t, zr)
			}
		})
	}
}

func TestReadFileFromZip(t *testing.T) {
	// Create a test zip
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	w, _ := zw.Create("test.txt")
	_, _ = w.Write([]byte("hello world"))
	_ = zw.Close()

	zr, _ := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))

	tests := []struct {
		name      string
		fileName  string
		wantErr   bool
		wantBytes []byte
	}{
		{
			name:      "Success - read existing file",
			fileName:  "test.txt",
			wantErr:   false,
			wantBytes: []byte("hello world"),
		},
		{
			name:     "Error - file not found",
			fileName: "nonexistent.txt",
			wantErr:  true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			data, err := ReadFileFromZip(zr, test.fileName)
			if (err != nil) != test.wantErr {
				t.Errorf("ReadFileFromZip() error = %v, wantErr %v", err, test.wantErr)
				return
			}

			if !test.wantErr && !bytes.Equal(data, test.wantBytes) {
				t.Errorf("ReadFileFromZip() got %q, want %q", string(data), string(test.wantBytes))
			}
		})
	}
}

func TestCopyDirectoryFromZip(t *testing.T) {
	// Create a test zip with files
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	if _, err := zw.Create("backup/dir1/"); err != nil {
		t.Fatalf("failed to create zip entry: %v", err)
	}
	w1, _ := zw.Create("backup/dir1/file1.txt")
	if _, err := w1.Write([]byte("content1")); err != nil {
		t.Fatalf("failed to write to zip: %v", err)
	}
	w2, _ := zw.Create("backup/dir1/file2.txt")
	if _, err := w2.Write([]byte("content2")); err != nil {
		t.Fatalf("failed to write to zip: %v", err)
	}
	w3, _ := zw.Create("backup/dir2/file3.txt")
	if _, err := w3.Write([]byte("content3")); err != nil {
		t.Fatalf("failed to write to zip: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("failed to close zip writer: %v", err)
	}

	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatalf("failed to create zip reader: %v", err)
	}

	tests := []struct {
		name      string
		dirWithin string
		destPath  string
		setupMock func(*fileaccessmock.MockDriver)
		wantErr   bool
	}{
		{
			name:      "Success - copy files from directory",
			dirWithin: "backup/dir1",
			destPath:  "dest",
			setupMock: func(md *fileaccessmock.MockDriver) {
				md.EXPECT().Save("dest/file1.txt", gomock.Any()).Return(nil)
				md.EXPECT().Save("dest/file2.txt", gomock.Any()).Return(nil)
			},
			wantErr: false,
		},
		{
			name:      "Success - copy files recursively from directory",
			dirWithin: "backup",
			destPath:  "dest",
			setupMock: func(md *fileaccessmock.MockDriver) {
				md.EXPECT().Save("dest/dir1/file1.txt", gomock.Any()).Return(nil)
				md.EXPECT().Save("dest/dir1/file2.txt", gomock.Any()).Return(nil)
				md.EXPECT().Save("dest/dir2/file3.txt", gomock.Any()).Return(nil)
			},
			wantErr: false,
		},
		{
			name:      "Success - copy files with empty directory (skip dirs)",
			dirWithin: "backup/empty",
			destPath:  "dest",
			setupMock: func(_ *fileaccessmock.MockDriver) {
				// No files to copy, no Save calls expected
			},
			wantErr: false,
		},
		{
			name:      "Error - Save fails",
			dirWithin: "backup/dir1",
			destPath:  "dest",
			setupMock: func(md *fileaccessmock.MockDriver) {
				md.EXPECT().Save("dest/file1.txt", gomock.Any()).Return(errors.New("save error"))
			},
			wantErr: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockDriver := fileaccessmock.NewMockDriver(ctrl)
			if test.setupMock != nil {
				test.setupMock(mockDriver)
			}

			err := CopyDirectoryFromZip(mockDriver, test.dirWithin, test.destPath, zr)
			if (err != nil) != test.wantErr {
				t.Errorf("CopyDirectoryFromZip() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

func TestCopyFileFromZip(t *testing.T) {
	// Create a test zip
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	w, _ := zw.Create("testfile.txt")
	if _, err := w.Write([]byte("test content")); err != nil {
		t.Fatalf("failed to write to zip: %v", err)
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("failed to close zip writer: %v", err)
	}

	zr, _ := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	zipFile := zr.File[0]

	tests := []struct {
		name      string
		zipFile   *zip.File
		destPath  string
		setupMock func(*fileaccessmock.MockDriver)
		wantErr   bool
	}{
		{
			name:     "Success - copy file",
			zipFile:  zipFile,
			destPath: "dest/file.txt",
			setupMock: func(md *fileaccessmock.MockDriver) {
				md.EXPECT().Save("dest/file.txt", gomock.Any()).Return(nil)
			},
			wantErr: false,
		},
		{
			name:     "Error - Save fails",
			zipFile:  zipFile,
			destPath: "dest/file.txt",
			setupMock: func(md *fileaccessmock.MockDriver) {
				md.EXPECT().Save("dest/file.txt", gomock.Any()).Return(errors.New("save failed"))
			},
			wantErr: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockDriver := fileaccessmock.NewMockDriver(ctrl)
			if test.setupMock != nil {
				test.setupMock(mockDriver)
			}

			err := copyFileFromZip(mockDriver, test.zipFile, test.destPath)
			if (err != nil) != test.wantErr {
				t.Errorf("copyFileFromZip() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

// Helper functions for testing

func createTestFS() fs.FS {
	return fstest.MapFS{
		"testdir/file1.txt":        &fstest.MapFile{Data: []byte("content1")},
		"testdir/file2.txt":        &fstest.MapFile{Data: []byte("content2")},
		"testdir/subdir/file3.txt": &fstest.MapFile{Data: []byte("content3")},
	}
}

type errorFS struct {
	err error
}

func (e *errorFS) Open(_ string) (fs.File, error) {
	return nil, e.err
}

func (e *errorFS) Stat(_ string) (fs.FileInfo, error) {
	return nil, e.err
}
