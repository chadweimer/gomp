package fileaccess

//go:generate go tool mockgen -destination=../mocks/upload/mocks.gen.go -package=upload . Driver

import (
	"io"
	"io/fs"
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

// CreateDriver returns a Driver implementation
func CreateDriver(cfg FilesConfig) (Driver, error) {
	return newFileSystemDriver(cfg.Path)
}
