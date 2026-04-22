package api

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"io/fs"
	"log/slog"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
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
	backupFilePath := filepath.Join(fileaccess.BackupDirectoryName, timestamp+".zip")
	if err = h.writeBackup(ctx, backupFilePath, logger, exportedData); err != nil {
		logger.ErrorContext(ctx, "Failed to write backup file", "error", err)
		// Attempt to clean up the backup file if it was created
		cleanupErr := h.fs.Delete(backupFilePath)
		if cleanupErr != nil {
			logger.ErrorContext(ctx, "Failed to clean up backup file", "error", cleanupErr)
		}
		return nil, err
	}

	fileURL := filepath.ToSlash(filepath.Join("/", backupFilePath))

	return CreateBackup201Response{
		Headers: CreateBackup201ResponseHeaders{
			Location: fileURL,
		},
	}, nil
}

func (h apiHandler) GetAllBackups(ctx context.Context, _ GetAllBackupsRequestObject) (GetAllBackupsResponseObject, error) {
	logger := middleware.GetLoggerFromContext(ctx)

	backupFiles, err := h.fs.List(fileaccess.BackupDirectoryName)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to export backup data", "error", err)
		return nil, err
	}

	backups := lo.Map(backupFiles, func(entry fs.DirEntry, _ int) models.Backup {
		return models.Backup{
			Name: entry.Name(),
			URL:  filepath.ToSlash(filepath.Join("/", fileaccess.BackupDirectoryName, entry.Name())),
		}
	})

	return GetAllBackups200JSONResponse(backups), nil
}

func (apiHandler) GetBackup(_ context.Context, _ GetBackupRequestObject) (GetBackupResponseObject, error) {
	return GetBackup200JSONResponse{}, nil
}

func (apiHandler) DeleteBackup(_ context.Context, _ DeleteBackupRequestObject) (DeleteBackupResponseObject, error) {
	return DeleteBackup204Response{}, nil
}

func (h apiHandler) writeBackup(ctx context.Context, filePath string, logger *slog.Logger, exportedData *models.BackupData) error {
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
		return fileaccess.CopyDirectoryToZip(h.fs, fileaccess.UploadDirectoryName, writer)
	})
}
