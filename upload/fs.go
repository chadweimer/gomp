package upload

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// FileSystemDriver is an implementation of Driver that uses the local file system.
type fileSystemDriver struct {
	http.FileSystem
	rootPath string
}

// NewFileSystemDriver constucts a FileSystemDriver.
func newFileSystemDriver(rootPath string) *fileSystemDriver {
	return &fileSystemDriver{rootPath: rootPath, FileSystem: &JustFilesFileSystem{http.Dir(rootPath)}}
}

// Save creates or overrites a file with the provided binary data.
func (u *fileSystemDriver) Save(filePath string, data []byte) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.rootPath, filePath)

	dir := filepath.Dir(filePath)
	err := os.MkdirAll(dir, os.ModePerm)
	if err != nil {
		return err
	}

	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.Write(data)
	return err
}

// Delete deletes the file at the specified path, if it exists.
func (u *fileSystemDriver) Delete(filePath string) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.rootPath, filePath)

	return os.Remove(filePath)
}

// DeleteAll deletes all files at or under the specified directory path.
func (u *fileSystemDriver) DeleteAll(dirPath string) error {
	// First prepend the base UploadPath
	dirPath = filepath.Join(u.rootPath, dirPath)

	return os.RemoveAll(dirPath)
}

// JustFilesFileSystem is an implementation of http.FileSystem that does
// not allow browsing directories.
type JustFilesFileSystem struct {
	fs http.FileSystem
}

// NewJustFilesFileSystem constucts a JustFilesFileSystem.
func NewJustFilesFileSystem(fs http.FileSystem) *JustFilesFileSystem {
	return &JustFilesFileSystem{fs: fs}
}

// Open returns a http.File is the assocaiated file exists.
// If the name specifies a directory, an os.ErrPermission
// error is returned
func (fs *JustFilesFileSystem) Open(name string) (http.File, error) {
	name = strings.TrimPrefix(name, "/")

	f, err := fs.fs.Open(name)
	if err != nil {
		return nil, err
	}

	stat, err := f.Stat()
	if err != nil {
		return nil, err
	}

	if stat.IsDir() {
		return nil, os.ErrPermission
	}

	return f, nil
}
