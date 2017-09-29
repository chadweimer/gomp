package upload

import (
	"log"
	"net/http"
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
	case "fs":
		return newFileSystemDriver(path)
	case "s3":
		return newS3Driver(path)
	}

	log.Fatalf("Invalid UploadDriver '%s' specified", driver)
	return nil
}
