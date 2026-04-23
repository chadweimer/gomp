package api

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"path/filepath"
	"time"

	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/models"
)

const (
	backupFileNameTimeFormat = "2006-01-02T15-04-05.000Z"
	metadataFileName         = "metadata.json"
	databaseFileName         = "database.json"
)

func (h apiHandler) CreateBackup(ctx context.Context, request CreateBackupRequestObject) (CreateBackupResponseObject, error) {
	logger := middleware.GetLoggerFromContext(ctx)

	name := time.Now().Format(backupFileNameTimeFormat)

	// If the request includes file content, use it as the source for the backup instead of exporting from the database.
	// This allows for restoring from a backup by uploading the backup file as the content of the request.
	uploadedFileData, _, err := readFile(request.Body)
	if err != nil && !errors.Is(err, io.EOF) {
		logger.ErrorContext(ctx, "Failed to read uploaded backup file content", "error", err)
		return nil, err
	}

	var backupFilePath string
	if err == nil {
		logger.DebugContext(ctx, "Creating backup from uploaded file content")

		// TODO: Verify it's a valid backup file before saving it.

		backupFilePath = filepath.Join(fileaccess.BackupDirectoryName, fmt.Sprintf("gomp-backup-upload-%s.zip", name))
		if err := h.fs.Save(backupFilePath, bytes.NewReader(uploadedFileData)); err != nil {
			logger.ErrorContext(ctx, "Failed to save uploaded backup file", "error", err)
			return nil, err
		}
	} else {
		logger.DebugContext(ctx, "Creating backup from database export")

		// Export all data from the database
		exportedData, err := h.db.Backups().Export(ctx)
		if err != nil {
			logger.ErrorContext(ctx, "Failed to export backup data", "error", err)
			return nil, err
		}

		// Save the backup file
		// Generate a name based on the current timestamp in UTC
		backupFilePath = filepath.Join(fileaccess.BackupDirectoryName, fmt.Sprintf("gomp-backup-%s.zip", name))
		if err = h.writeBackup(ctx, logger, name, backupFilePath, exportedData); err != nil {
			logger.ErrorContext(ctx, "Failed to write backup file", "error", err)
			// Attempt to clean up the backup file if it was created
			cleanupErr := h.fs.Delete(backupFilePath)
			if cleanupErr != nil {
				logger.ErrorContext(ctx, "Failed to clean up backup file", "error", cleanupErr)
			}
			return nil, err
		}
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
		return GetAllBackups500Response{}, nil
	}

	backups := make([]models.Backup, 0, len(backupFiles))
	for _, entry := range backupFiles {
		if entry.IsDir() {
			logger.WarnContext(ctx, "Skipping directory in backup listing", "name", entry.Name())
			continue
		}

		info, err := entry.Info()
		if err != nil {
			logger.WarnContext(ctx, "Skipping backup file due to stat error", "error", err, "name", entry.Name())
			continue
		}

		backup, err := h.readBackup(ctx, logger, info, entry)
		if err != nil {
			logger.WarnContext(ctx, "Skipping backup file due to read error", "error", err, "name", entry.Name())
			continue
		}
		backups = append(backups, *backup)
	}

	return GetAllBackups200JSONResponse(backups), nil
}

func (h apiHandler) RestoreFromBackup(ctx context.Context, request RestoreFromBackupRequestObject) (RestoreFromBackupResponseObject, error) {
	logger := middleware.GetLoggerFromContext(ctx)

	backupFilePath := filepath.Join(fileaccess.BackupDirectoryName, request.FileName)

	info, err := h.fs.Stat(backupFilePath)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to stat backup file", "error", err, "name", request.FileName)
		return RestoreFromBackup400Response{}, nil
	}
	if info.IsDir() {
		logger.ErrorContext(ctx, "Backup file is a directory", "name", request.FileName)
		return RestoreFromBackup400Response{}, nil
	}

	file, err := h.fs.Open(filepath.Join(fileaccess.BackupDirectoryName, info.Name()))
	if err != nil {
		return RestoreFromBackup400Response{}, nil
	}
	defer file.Close()

	var databaseData *models.BackupData
	err = fileaccess.ReadZip(file, info.Size(), func(reader *zip.Reader) error {
		metadataContent, err := readJSONFileFromZip[models.BackupMetadata](reader, metadataFileName)
		if err != nil {
			logger.ErrorContext(ctx, "Failed to read backup metadata", "error", err, "name", request.FileName)
			return err
		}
		if !metadataContent.Validate() {
			logger.ErrorContext(ctx, "Backup file has invalid metadata", "name", request.FileName, "metadata", metadataContent)
			return err
		}

		databaseData, err = readJSONFileFromZip[models.BackupData](reader, databaseFileName)
		if err != nil {
			logger.ErrorContext(ctx, "Failed to read backup data", "error", err, "name", request.FileName)
			return err
		}

		err = fileaccess.CopyDirectoryFromZip(h.fs, fileaccess.UploadDirectoryName, fileaccess.UploadDirectoryName, reader)
		if err != nil {
			logger.ErrorContext(ctx, "Failed to copy files from backup", "error", err, "name", request.FileName)
			return err
		}

		return nil
	})
	if err != nil {
		logger.ErrorContext(ctx, "Failed to read backup zip file", "error", err, "name", request.FileName)
		return RestoreFromBackup400Response{}, nil
	}

	err = h.db.Backups().Import(ctx, databaseData)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to import backup data", "error", err, "name", request.FileName)
		return RestoreFromBackup400Response{}, nil
	}

	return RestoreFromBackup204Response{}, nil
}

func (h apiHandler) DeleteBackup(ctx context.Context, request DeleteBackupRequestObject) (DeleteBackupResponseObject, error) {
	logger := middleware.GetLoggerFromContext(ctx)

	err := h.fs.Delete(filepath.Join(fileaccess.BackupDirectoryName, request.FileName))
	if err != nil {
		logger.ErrorContext(ctx, "Failed to delete backup file", "error", err, "backupFileName", request.FileName)
		return nil, err
	}
	return DeleteBackup204Response{}, nil
}

func (h apiHandler) writeBackup(ctx context.Context, logger *slog.Logger, name, filePath string, exportedData *models.BackupData) error {
	backupFile, err := h.fs.Create(filePath)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to create backup file", "error", err)
		return err
	}
	defer backupFile.Close()

	return fileaccess.CreateZip(backupFile, func(writer *zip.Writer) error {
		// Write the metadata to a JSON file in the zip
		metadata := models.BackupMetadata{
			Name:    name,
			Version: metadata.BuildVersion,
		}
		if err := writeJSONFileToZip(writer, "metadata.json", metadata); err != nil {
			logger.ErrorContext(ctx, "Failed to write backup metadata to zip", "error", err)
			return err
		}

		// Write the database backup to JSON
		if err := writeJSONFileToZip(writer, "database.json", exportedData); err != nil {
			logger.ErrorContext(ctx, "Failed to write backup data to zip", "error", err)
			return err
		}

		logger.DebugContext(ctx, "Copied backup data to zip")

		// Copy all uploads to the backup directory
		return fileaccess.CopyDirectoryToZip(h.fs, fileaccess.UploadDirectoryName, writer)
	})
}

func (h apiHandler) readBackup(ctx context.Context, logger *slog.Logger, info fs.FileInfo, entry fs.DirEntry) (*models.Backup, error) {
	file, err := h.fs.Open(filepath.Join(fileaccess.BackupDirectoryName, info.Name()))
	if err != nil {
		logger.ErrorContext(ctx, "Failed to read backup file", "error", err, "name", entry.Name())
		return nil, err
	}
	defer file.Close()

	var backup models.Backup
	err = fileaccess.ReadZip(file, info.Size(), func(reader *zip.Reader) error {
		metadataContent, err := readJSONFileFromZip[models.BackupMetadata](reader, metadataFileName)
		if err != nil {
			logger.ErrorContext(ctx, "Failed to read metadata from backup", "error", err, "name", entry.Name())
			return err
		}
		if !metadataContent.Validate() {
			logger.ErrorContext(ctx, "Backup file has invalid metadata", "name", entry.Name(), "metadata", metadataContent)
			return errors.New("invalid backup metadata")
		}

		backup = models.Backup{
			Metadata: *metadataContent,
			FileName: entry.Name(),
			FileURL:  filepath.ToSlash(filepath.Join("/", fileaccess.BackupDirectoryName, entry.Name())),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &backup, nil
}

func writeJSONFileToZip(writer *zip.Writer, fileName string, data any) error {
	buf, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return fileaccess.WriteFileToZip(fileName, bytes.NewBuffer(buf), writer)
}

func readJSONFileFromZip[T any](zipReader *zip.Reader, name string) (*T, error) {
	data, err := fileaccess.ReadFileFromZip(zipReader, name)
	if err != nil {
		return nil, err
	}

	content := new(T)
	if err := json.Unmarshal(data, content); err != nil {
		return nil, err
	}
	return content, nil
}
