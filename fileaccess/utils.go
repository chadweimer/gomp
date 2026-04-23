package fileaccess

import (
	"archive/zip"
	"errors"
	"io"
	"io/fs"
)

// CreateZip creates a zip archive using the provided writer.
func CreateZip(ioWriter io.Writer, writeContent func(*zip.Writer) error) error {
	zipWriter := zip.NewWriter(ioWriter)
	defer zipWriter.Close()

	return writeContent(zipWriter)
}

// WriteFileToZip adds a file to a zip archive.
func WriteFileToZip(name string, src io.Reader, zipWriter *zip.Writer) (err error) {
	if file, err := zipWriter.Create(name); err == nil {
		_, err = io.Copy(file, src)
	}
	return err
}

// CopyDirectoryToZip copies a directory and its contents to a zip archive.
func CopyDirectoryToZip(f fs.FS, srcPath string, writer *zip.Writer) error {
	// Do nothing if the directory doesn't exist
	if _, err := fs.Stat(f, srcPath); err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil
		}
		return err
	}

	subFs, err := fs.Sub(f, srcPath)
	if err != nil {
		return err
	}

	return writer.AddFS(subFs)
}
