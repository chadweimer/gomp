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

func NewFileSystemDriver(cfg *conf.Config) FileSystemDriver {
	return FileSystemDriver{cfg: cfg}
}

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

func (u FileSystemDriver) Delete(filePath string) error {
	// First prepend the base UploadPath
	filePath = filepath.Join(u.cfg.UploadPath, filePath)

	return os.Remove(filePath)
}
func (u FileSystemDriver) DeleteAll(dirPath string) error {
	// First prepend the base UploadPath
	dirPath = filepath.Join(u.cfg.UploadPath, dirPath)

	return os.RemoveAll(dirPath)
}

func (u FileSystemDriver) List(dirPath string) ([]string, []string, []string, error) {
	var names []string
	var origURLs []string
	var thumbURLs []string

	// First prepend the base UploadPath
	origDirPath := filepath.Join(u.cfg.UploadPath, dirPath, "images")
	if _, err := os.Stat(origDirPath); os.IsNotExist(err) {
		return names, origURLs, thumbURLs, nil
	}

	files, err := ioutil.ReadDir(origDirPath)
	if err != nil {
		return names, origURLs, thumbURLs, err
	}

	// TODO: Restrict based on file extension?
	for _, file := range files {
		if !file.IsDir() {
			names = append(names, file.Name())

			origPath := filepath.Join(origDirPath, file.Name())
			origURLs = append(origURLs, u.convertPathToURL(origPath))

			thumbPath := filepath.Join(u.cfg.UploadPath, dirPath, "thumbs", file.Name())
			if _, err := os.Stat(thumbPath); err == nil {
				thumbURLs = append(thumbURLs, u.convertPathToURL(thumbPath))
			} else {
				thumbURLs = append(thumbURLs, "")
			}
		}
	}

	return names, origURLs, thumbURLs, nil
}

func (u FileSystemDriver) convertPathToURL(path string) string {
	fullFilePath := filepath.Join("/uploads", strings.TrimPrefix(path, u.cfg.UploadPath))
	return u.cfg.RootURLPath + filepath.ToSlash(fullFilePath)
}
