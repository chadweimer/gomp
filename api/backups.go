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
	"github.com/chadweimer/gomp/middleware"
)

func (h apiHandler) CreateBackup(ctx context.Context, _ CreateBackupRequestObject) (CreateBackupResponseObject, error) {
	logger := middleware.GetLoggerFromContext(ctx)

	// Export all data from the database
	exportedData, err := h.db.Backups().Export(ctx)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to export backup data", "error", err)
		return nil, err
	}

	tempFile, err := os.CreateTemp("", "backup-*.zip")
	if err != nil {
		logger.ErrorContext(ctx, "Failed to create temp file", "error", err)
		return nil, err
	}
	defer tempFile.Close()
	defer os.Remove(tempFile.Name())

	logger.DebugContext(ctx, "Created temp file")

	err = fileaccess.CreateZip(tempFile, func(writer *zip.Writer) error {
		// // Write the backup to JSON
		buf, err := json.MarshalIndent(exportedData, "", "  ")
		if err != nil {
			logger.ErrorContext(ctx, "Failed to marshal backup data", "error", err)
			return err
		}
		if err := fileaccess.WriteFileToZip("data.json", bytes.NewBuffer(buf), writer); err != nil {
			logger.ErrorContext(ctx, "Failed to write backup data to zip", "error", err)
			return err
		}

		logger.DebugContext(ctx, "Copied backup data to zip")

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
