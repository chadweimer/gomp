package upload

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
)

// fileSystemDriver is an implementation of Driver that uses the local file system.
type fileSystemDriver struct {
	fs.FS
	rootPath string
}

func newFileSystemDriver(rootPath string) (Driver, error) {
	return &fileSystemDriver{OnlyFiles(os.DirFS(rootPath)), rootPath}, nil
}

func (u *fileSystemDriver) List(basePath string) ([]string, error) {
	// First prepend the base UploadPath
	fullBasePath := filepath.Join(u.rootPath, filepath.Clean(basePath))

	files := make([]string, 0)
	entries, err := os.ReadDir(fullBasePath)
	if err != nil {
		// TODO: Log and continue?
		return nil, err
	}
	for _, d := range entries {
		if d != nil && !d.IsDir() {
			filePath := filepath.Join(basePath, d.Name())
			files = append(files, filePath)
		}
	}

	return files, nil
}

func (u *fileSystemDriver) Save(filePath string, data []byte) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.rootPath, filepath.Clean(filePath))

	dir := filepath.Dir(filePath)
	err := os.MkdirAll(dir, os.ModePerm)
	if err != nil {
		return err
	}

	file, err := os.Create(filePath) //#nosec G304 -- Path already cleaned
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			if err != nil {
				log.Warn().Err(closeErr).Str("file", filePath).Msg("Failed to close file after a previous error")
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
func OnlyFiles(fs fs.FS) fs.FS {
	return &justFilesFileSystem{fs}
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
