package api

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"io/fs"
	"path/filepath"
	"time"
)

func (h apiHandler) CreateBackup(_ context.Context, _ CreateBackupRequestObject) (CreateBackupResponseObject, error) {
	// Generate a name based on the current timestamp in UTC
	timestamp := time.Now().Format("2006-01-02T15-04-05.000Z")
	backupFilePath := filepath.Join("backups", timestamp+".zip")
	backupFileBuffer := new(bytes.Buffer)
	zipWriter := zip.NewWriter(backupFileBuffer)
	defer zipWriter.Close()

	// Export recipes
	exportedRecipes, err := h.db.Backups().ExportRecipes()
	if err != nil {
		return nil, err
	}

	// Marshal the exported recipes to JSON
	buf, err := json.MarshalIndent(exportedRecipes, "", "  ")
	if err != nil {
		return nil, err
	}

	// Write the recipe backup to a file
	recipesFile, err := zipWriter.Create("recipes.json")
	if err != nil {
		return nil, err
	}
	_, err = recipesFile.Write(buf)
	if err != nil {
		return nil, err
	}

	// Export users
	exportedUsers, err := h.db.Backups().ExportUsers()
	if err != nil {
		return nil, err
	}

	// Marshal the exported recipes to JSON
	buf, err = json.MarshalIndent(exportedUsers, "", "  ")
	if err != nil {
		return nil, err
	}
	// Write the users backup to a file
	usersFile, err := zipWriter.Create("users.json")
	if err != nil {
		return nil, err
	}
	_, err = usersFile.Write(buf)
	if err != nil {
		return nil, err
	}

	// Copy all uploads to the backup directory
	if err = h.copyTo("uploads", zipWriter); err != nil {
		return nil, err
	}

	// Save the backup file
	if err = zipWriter.Close(); err != nil {
		return nil, err
	}
	if err = h.fs.Save(backupFilePath, backupFileBuffer.Bytes()); err != nil {
		return nil, err
	}

	// TODO: Give back the location of the backup
	return CreateBackup201Response{}, nil
}

func (apiHandler) GetAllBackups(_ context.Context, _ GetAllBackupsRequestObject) (GetAllBackupsResponseObject, error) {
	return GetAllBackups200Response{}, nil
}

func (apiHandler) GetBackup(_ context.Context, _ GetBackupRequestObject) (GetBackupResponseObject, error) {
	return GetBackup200ApplicationGzipResponse{}, nil
}

func (h apiHandler) copyTo(srcPath string, writer *zip.Writer) error {
	return fs.WalkDir(h.fs, srcPath, func(currentSrcPath string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if currentSrcPath == srcPath {
			return nil
		}

		// Recurse into directories
		if d.IsDir() {
			return h.copyTo(currentSrcPath, writer)
		}

		// Read the content of the file
		srcFile, err := h.fs.Open(currentSrcPath)
		if err != nil {
			return err
		}
		data, err := io.ReadAll(srcFile)
		if err != nil {
			return err
		}

		// Write the content to the destination writer
		destFile, err := writer.Create(currentSrcPath)
		if err != nil {
			return err
		}
		_, err = destFile.Write(data)
		return err
	})
}
