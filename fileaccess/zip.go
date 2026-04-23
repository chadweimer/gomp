package fileaccess

import (
	"archive/zip"
	"errors"
	"io"
	"io/fs"
	"path/filepath"
	"strings"
)

// CreateZip creates a zip archive using the provided writer.
func CreateZip(ioWriter io.Writer, writeContent func(*zip.Writer) error) error {
	zipWriter := zip.NewWriter(ioWriter)
	defer zipWriter.Close()

	return writeContent(zipWriter)
}

// ReadZip reads a zip archive from the provided reader and size, and processes its content using the provided function.
func ReadZip(ioReader io.Reader, size int64, readContent func(*zip.Reader) error) error {
	zipReader, err := zip.NewReader(ensureReaderAt(ioReader), size)
	if err != nil {
		return err
	}
	return readContent(zipReader)
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

// ReadFileFromZip reads a file from a zip archive and returns its content as bytes.
func ReadFileFromZip(zipReader *zip.Reader, name string) ([]byte, error) {
	file, err := zipReader.Open(name)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return io.ReadAll(file)
}

// CopyDirectoryFromZip copies files from a specified directory within a zip archive to a destination path using the provided Driver.
func CopyDirectoryFromZip(f Driver, dirWithinBackup, destPath string, zipReader *zip.Reader) error {
	// Iterate through the files in the zip under the specified path
	for _, zipFile := range zipReader.File {
		// Confirm the file is under the specified directory within the backup
		if !strings.HasPrefix(zipFile.Name, dirWithinBackup+"/") {
			continue
		}

		destFilePath := filepath.Join(destPath, strings.TrimPrefix(zipFile.Name, dirWithinBackup+"/"))

		if zipFile.FileInfo().IsDir() {
			continue
		}

		err := copyFileFromZip(f, zipFile, destFilePath)
		if err != nil {
			return err
		}
	}

	return nil
}

func copyFileFromZip(f Driver, zipFile *zip.File, destFilePath string) error {
	srcFile, err := zipFile.Open()
	if err != nil {
		return err
	}
	defer srcFile.Close()

	return f.Save(destFilePath, srcFile)
}
