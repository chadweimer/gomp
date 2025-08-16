package api

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/fileaccess"
)

func (h apiHandler) CreateBackup(_ context.Context, _ CreateBackupRequestObject) (CreateBackupResponseObject, error) {
	// Export all data from the database
	exportedData, err := h.db.Backups().Export()
	if err != nil {
		return nil, err
	}

	tempFile, err := os.CreateTemp("", "backup-*.zip")
	if err != nil {
		return nil, err
	}
	defer tempFile.Close()
	defer os.RemoveAll(tempFile.Name())

	err = fileaccess.CreateZip(tempFile, func(writer *zip.Writer) error {
		// // Write the backup to JSON
		buf, err := json.MarshalIndent(exportedData, "", "  ")
		if err != nil {
			return err
		}
		if err := fileaccess.WriteFileToZip("data.json", bytes.NewBuffer(buf), writer); err != nil {
			return err
		}

		// Copy all uploads to the backup directory
		return fileaccess.CopyDirectoryToZip(h.fs, fileaccess.RootUploadPath, writer)
	})

	// Save the backup file
	// Generate a name based on the current timestamp in UTC
	timestamp := time.Now().Format("2006-01-02T15-04-05.000Z")
	backupFilePath := filepath.Join("backups", timestamp+".zip")
	if err = h.fs.Save(backupFilePath, tempFile); err != nil {
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
