package api

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/models"
)

func (h apiHandler) CreateBackup(ctx context.Context, _ CreateBackupRequestObject) (CreateBackupResponseObject, error) {
	logger := middleware.GetLoggerFromContext(ctx)

	// Export all data from the database
	exportedData, err := h.db.Backups().Export(ctx)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to export backup data", "error", err)
		return nil, err
	}

	// Save the backup file
	// Generate a name based on the current timestamp in UTC
	timestamp := time.Now().Format("2006-01-02T15-04-05.000Z")
	backupFilePath := filepath.Join("backups", timestamp+".zip")
	if err = h.writeBackup(ctx, backupFilePath, logger, exportedData); err != nil {
		logger.ErrorContext(ctx, "Failed to write backup file", "error", err)
		// Attempt to clean up the backup file if it was created
		cleanupErr := h.fs.Delete(backupFilePath)
		if cleanupErr != nil {
			logger.ErrorContext(ctx, "Failed to clean up backup file", "error", cleanupErr)
		}
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

func (h apiHandler) writeBackup(ctx context.Context, filePath string, logger *slog.Logger, exportedData *models.Backup) error {
	backupFile, err := h.fs.Create(filePath)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to create backup file", "error", err)
		return err
	}
	defer backupFile.Close()

	return fileaccess.CreateZip(backupFile, func(writer *zip.Writer) error {
		// Write the backup to JSON
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
}
