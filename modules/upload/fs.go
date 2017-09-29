package upload

import (
	"net/http"
	"os"
	"path/filepath"
)

// FileSystemDriver is an implementation of Driver that uses the local file system.
type fileSystemDriver struct {
	rootPath string
	fs       http.FileSystem
}

// NewFileSystemDriver constucts a FileSystemDriver.
func newFileSystemDriver(rootPath string) fileSystemDriver {
	return fileSystemDriver{rootPath: rootPath, fs: http.Dir(rootPath)}
}

// Save creates or overrites a file with the provided binary data.
func (u fileSystemDriver) Save(filePath string, data []byte) error {
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
func (u fileSystemDriver) Delete(filePath string) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.rootPath, filePath)

	return os.Remove(filePath)
}

// DeleteAll deletes all files at or under the specified directory path.
func (u fileSystemDriver) DeleteAll(dirPath string) error {
	// First prepend the base UploadPath
	dirPath = filepath.Join(u.rootPath, dirPath)

	return os.RemoveAll(dirPath)
}

func (u fileSystemDriver) Open(name string) (http.File, error) {
	file, err := u.fs.Open(name)
	if err != nil {
		return nil, err
	}
	stat, err := file.Stat()
	if err != nil {
		return nil, err
	}

	if !stat.IsDir() {
		return file, nil
	}
	return nil, os.ErrNotExist
}
