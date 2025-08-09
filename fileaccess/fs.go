package fileaccess

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
	fs.FS
	rootPath string
}

func newFileSystemDriver(rootPath string) (Driver, error) {
	if rootPath == "" {
		return nil, errors.New("root path is empty")
	}

	return &fileSystemDriver{OnlyFiles(os.DirFS(rootPath)), rootPath}, nil
}

func (u *fileSystemDriver) CopyAll(srcPath, destPath string) error {
	srcPath = filepath.Join(u.rootPath, filepath.Clean(srcPath))
	return u.copyRecursively(srcPath, destPath)
}

func (u *fileSystemDriver) copyRecursively(srcPath, destPath string) error {
	return filepath.WalkDir(srcPath, func(currentSrcPath string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if currentSrcPath == srcPath {
			return nil
		}

		// Get the relative path from srcPath to the current path
		relPath, err := filepath.Rel(srcPath, currentSrcPath)
		if err != nil {
			return err
		}
		// Construct the destination path
		currentDestPath := filepath.Join(destPath, relPath)

		// Recurse into directories
		if d.IsDir() {
			// Recursively copy
			return u.copyRecursively(currentSrcPath, currentDestPath)
		}

		// Read the content of the file
		data, err := os.ReadFile(currentSrcPath) // #nosec G304 -- Path already cleaned
		if err != nil {
			return err
		}

		return u.Save(currentDestPath, data)
	})
}

func (u *fileSystemDriver) Save(filePath string, data []byte) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.rootPath, filepath.Clean(filePath))

	dir := filepath.Dir(filePath)
	err := os.MkdirAll(dir, fs.FileMode(0777))
	if err != nil {
		return err
	}

	file, err := os.Create(filePath) // #nosec G304 -- Path already cleaned
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
	// First prepend the base UploadPath
	filePath = filepath.Join(u.rootPath, filepath.Clean(filePath))

	return os.Remove(filePath)
}

func (u *fileSystemDriver) DeleteAll(dirPath string) error {
	// First prepend the base UploadPath
	dirPath = filepath.Join(u.rootPath, filepath.Clean(dirPath))

	return os.RemoveAll(dirPath)
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
