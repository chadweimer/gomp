package fileaccess

import (
	"archive/zip"
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
	return fs.WalkDir(f, srcPath, func(name string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if name == srcPath {
			return nil
		}

		// Recurse into directories
		if d.IsDir() {
			return CopyDirectoryToZip(f, name, writer)
		}

		// Write the content to the destination
		if file, err := f.Open(name); err == nil {
			return WriteFileToZip(name, file, writer)
		}

		return err
	})
}
