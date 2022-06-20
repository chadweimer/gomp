package upload

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// fileSystemDriver is an implementation of Driver that uses the local file system.
type fileSystemDriver struct {
	fs.FS
	rootPath string
}

func newFileSystemDriver(rootPath string) (Driver, error) {
	return &fileSystemDriver{rootPath: rootPath, FS: OnlyFiles(os.DirFS(rootPath))}, nil
}

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

func (u *fileSystemDriver) Delete(filePath string) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.rootPath, filePath)

	return os.Remove(filePath)
}

func (u *fileSystemDriver) DeleteAll(dirPath string) error {
	// First prepend the base UploadPath
	dirPath = filepath.Join(u.rootPath, dirPath)

	return os.RemoveAll(dirPath)
}

type justFilesFileSystem struct {
	fs fs.FS
}

// OnlyFiles constucts a fs.FS that returns fs.ErrPermission for directories.
func OnlyFiles(fs fs.FS) fs.FS {
	return &justFilesFileSystem{fs: fs}
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
