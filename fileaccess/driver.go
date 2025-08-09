package fileaccess

//go:generate go run github.com/golang/mock/mockgen -destination=../mocks/fileaccess/mocks.gen.go -package=fileaccess . Driver

import (
	"fmt"
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

	// CopyAll copies all files from the source path to the destination path.
	// If the destination path does not exist, it will be created.
	// If the source path does not exist, an error will be returned.
	// If the source path is a file, it will be copied directly to the destination path.
	CopyAll(srcPath, destPath string) error

	// Save creates or overrites a file with the provided binary data.
	Save(filePath string, data []byte) error

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
