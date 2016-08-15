package upload

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/chadweimer/gomp/modules/conf"
)

// FileSystemDriver is an implementation of Driver that uses the local file system.
type FileSystemDriver struct {
	cfg *conf.Config
}

// NewFileSystemDriver constucts a FileSystemDriver.
func NewFileSystemDriver(cfg *conf.Config) FileSystemDriver {
	return FileSystemDriver{cfg: cfg}
}

// Save creates or overrites a file with the provided binary data.
func (u FileSystemDriver) Save(filePath string, data []byte) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.cfg.UploadPath, filePath)

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
func (u FileSystemDriver) Delete(filePath string) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.cfg.UploadPath, filePath)

	return os.Remove(filePath)
}

// DeleteAll deletes all files at or under the specified directory path.
func (u FileSystemDriver) DeleteAll(dirPath string) error {
	// First prepend the base UploadPath
	dirPath = filepath.Join(u.cfg.UploadPath, dirPath)

	return os.RemoveAll(dirPath)
}

// List retrieves information about all uploaded files under the specified directory.
func (u FileSystemDriver) List(dirPath string) ([]FileInfo, error) {
	var fileInfos []FileInfo

	// First prepend the base UploadPath
	origDirPath := filepath.Join(u.cfg.UploadPath, dirPath, "images")
	if _, err := os.Stat(origDirPath); os.IsNotExist(err) {
		return fileInfos, nil
	}

	files, err := ioutil.ReadDir(origDirPath)
	if err != nil {
		return fileInfos, err
	}

	for _, file := range files {
		if !file.IsDir() {
			name := file.Name()
			origPath := filepath.Join(origDirPath, file.Name())
			thumbPath := filepath.Join(u.cfg.UploadPath, dirPath, "thumbs", file.Name())

			fileInfo := FileInfo{
				Name: name,
				URL:  u.convertPathToURL(origPath),
			}
			if _, err := os.Stat(thumbPath); err == nil {
				fileInfo.ThumbnailURL = u.convertPathToURL(thumbPath)
			}
			fileInfos = append(fileInfos, fileInfo)
		}
	}

	return fileInfos, nil
}

func (u FileSystemDriver) convertPathToURL(path string) string {
	fullFilePath := filepath.Join("/uploads", strings.TrimPrefix(path, u.cfg.UploadPath))
	return filepath.ToSlash(fullFilePath)
}
