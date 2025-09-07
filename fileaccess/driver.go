package fileaccess

//go:generate go run github.com/golang/mock/mockgen -destination=../mocks/fileaccess/mocks.gen.go -package=fileaccess . Driver

import (
	"fmt"
	"io"
	"io/fs"
)

const (
	// FileSystemDriver is the name to use for the file system driver
	FileSystemDriver = "fs"

	// S3Driver is the name to use for the Amazon S3 driver
	S3Driver = "s3"
)

// Driver represents an abstraction layer for handling file uploads
type Driver interface {
	fs.FS

	// Save creates or overrites a file with the content from the provider reader.
	// This will seek to the beginning of the content.
	Save(filePath string, reader io.ReadSeeker) error

	// Delete deletes the file at the specified path, if it exists.
	Delete(filePath string) error

	// DeleteAll deletes all files at or under the specified directory path.
	DeleteAll(dirPath string) error
}

// CreateDriver returns a Driver implementation based upon the value of the driver parameter
func CreateDriver(cfg FilesConfig) (Driver, error) {
	switch cfg.Driver {
	case FileSystemDriver:
		return newFileSystemDriver(cfg.Path)
	case S3Driver:
		return newS3Driver(cfg.Path)
	}

	return nil, fmt.Errorf("invalid Driver '%s' specified; driver must be one of ('%s', '%s')",
		cfg.Driver, FileSystemDriver, S3Driver)
}
