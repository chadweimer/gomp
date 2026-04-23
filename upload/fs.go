package upload

import (
	"errors"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
)

// fileSystemDriver is an implementation of Driver that uses the local file system.
type fileSystemDriver struct {
	root *os.Root
}

func newFileSystemDriver(rootPath string) (Driver, error) {
	if rootPath == "" {
		return nil, errors.New("root path is empty")
	}

	root, err := os.OpenRoot(rootPath)
	if err != nil {
		return nil, err
	}
	return &fileSystemDriver{root}, nil
}

func (u *fileSystemDriver) Open(filePath string) (fs.File, error) {
	return u.root.Open(filepath.Clean(filePath))
}

func (u *fileSystemDriver) Save(filePath string, data []byte) error {
	dir := filepath.Dir(filepath.Clean(filePath))
	if err := u.root.MkdirAll(dir, fs.FileMode(0777)); err != nil {
		return err
	}

	file, err := u.root.Create(filePath) // #nosec G304 -- Path already cleaned
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			if err != nil {
				slog.Warn("Failed to close file after a previous error",
					"error", closeErr,
					"file", filePath)
			} else {
				err = closeErr
			}
		}
	}()

	_, err = file.Write(data)
	return err
}

func (u *fileSystemDriver) Delete(filePath string) error {
	return u.root.Remove(filepath.Clean(filePath))
}

func (u *fileSystemDriver) DeleteAll(dirPath string) error {
	return u.root.RemoveAll(filepath.Clean(dirPath))
}

type justFilesFileSystem struct {
	fs fs.FS
}

// OnlyFiles constucts a fs.FS that returns fs.ErrPermission for directories.
func OnlyFiles(f fs.FS) fs.FS {
	return &justFilesFileSystem{f}
}

func (f *justFilesFileSystem) Open(name string) (fs.File, error) {
	name = strings.TrimPrefix(name, "/")

	file, err := f.fs.Open(name)
	if err != nil {
		return nil, err
	}

	stat, err := file.Stat()
	if err != nil {
		return nil, err
	}

	if stat.IsDir() {
		return nil, fs.ErrPermission
	}

	return file, nil
}
