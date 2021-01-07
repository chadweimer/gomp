package upload

import (
	"log"
	"net/http"
)

const (
	// FileSystemDriver is the name to use for the file system driver
	FileSystemDriver = "fs"

	// S3Driver is the name to use for the Amazon S3 driver
	S3Driver = "s3"
)

// Driver represents an abstraction layer for handling file uploads
type Driver interface {
	http.FileSystem
	Save(filePath string, data []byte) error
	Delete(filePath string) error
	DeleteAll(dirPath string) error
}

// CreateDriver returns a Driver implementation based upon the value of the driver parameter
func CreateDriver(driver string, path string) Driver {
	switch driver {
	case FileSystemDriver:
		return newFileSystemDriver(path)
	case S3Driver:
		return &s3Driver{path}
	}

	log.Fatalf("Invalid UploadDriver '%s' specified", driver)
	return nil
}
