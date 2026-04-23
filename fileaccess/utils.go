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

	return fs.WalkDir(f, srcPath, func(name string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the directories since WalkDir already recurses into them
		if d.IsDir() {
			return nil
		}

		// Write the content to the destination
		if file, err := f.Open(name); err == nil {
			return WriteFileToZip(name, file, writer)
		}

		return err
	})
}
