package fileaccess

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/samber/lo"
)

// fileSystemDriver is an implementation of Driver that uses the local file system.
type fileSystemDriver struct {
	root *os.Root
}

func newFileSystemDriver(rootPath string) (Driver, error) {
	if rootPath == "" {
		return nil, errors.New("root path is empty")
	}

	// Make sure the root path exists and is a directory
	if err := os.MkdirAll(rootPath, 0750); err != nil {
		return nil, fmt.Errorf("creating root path: %w", err)
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

func (u *fileSystemDriver) Create(filePath string) (io.WriteCloser, error) {
	cleanedPath := filepath.Clean(filePath)
	dir := filepath.Dir(cleanedPath)
	if err := u.root.MkdirAll(dir, fs.FileMode(0750)); err != nil {
		return nil, err
	}

	return u.root.Create(cleanedPath)
}

func (u *fileSystemDriver) Save(filePath string, reader io.Reader) error {
	// Make sure we're at the beginning of the content
	if seeker, ok := reader.(io.Seeker); ok {
		_, err := seeker.Seek(0, io.SeekStart)
		if err != nil {
			return err
		}
	}

	file, err := u.Create(filePath)
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

	_, err = io.Copy(file, reader)
	return err
}

func (u *fileSystemDriver) Delete(filePath string) error {
	return u.root.Remove(filepath.Clean(filePath))
}

func (u *fileSystemDriver) DeleteAll(dirPath string) error {
	return u.root.RemoveAll(filepath.Clean(dirPath))
}

func (u *fileSystemDriver) Stat(path string) (fs.FileInfo, error) {
	return u.root.Stat(filepath.Clean(path))
}

func (u *fileSystemDriver) List(dirPath string) ([]fs.DirEntry, error) {
	dir, err := u.root.Open(filepath.Clean(dirPath))
	if err != nil {
		return nil, err
	}
	defer dir.Close()

	stat, err := dir.Stat()
	if err != nil {
		return nil, err
	}

	if !stat.IsDir() {
		return nil, fs.ErrInvalid
	}

	entries, err := dir.ReadDir(0)
	if err != nil {
		return nil, err
	}

	// Filter out directories, only return files
	fileEntries := lo.Filter(entries, func(entry fs.DirEntry, _ int) bool {
		return !entry.IsDir()
	})

	return fileEntries, nil
}

type onlyFilesFileSystem struct {
	fs fs.FS
}

// OnlyFiles constucts a fs.FS that returns fs.ErrPermission for directories.
func OnlyFiles(f fs.FS) fs.FS {
	return &onlyFilesFileSystem{f}
}

func (f *onlyFilesFileSystem) Open(name string) (fs.File, error) {
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
