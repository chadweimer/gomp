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
	name := time.Now().Format("2006-01-02T15-04-05.000Z")
	backupFilePath := filepath.Join(fileaccess.BackupDirectoryName, fmt.Sprintf("gomp-backup-%s.zip", name))
	if err = h.writeBackup(ctx, name, backupFilePath, logger, exportedData); err != nil {
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
		return GetAllBackups500Response{}, nil
	}

	backups := make([]models.Backup, 0, len(backupFiles))
	for _, entry := range backupFiles {
		if entry.IsDir() {
			logger.WarnContext(ctx, "Skipping directory in backup listing", "name", entry.Name())
			continue
		}

		metadataContent, err := h.getBackupMetadata(entry)
		if err != nil {
			logger.WarnContext(ctx, "Skipping backup file due to metadata error", "name", entry.Name())
			continue
		}
		if !metadataContent.Validate() {
			logger.WarnContext(ctx, "Skipping backup file due to invalid metadata", "name", entry.Name(), "metadata", metadataContent)
			continue
		}

		backups = append(backups, models.Backup{
			Metadata: *metadataContent,
			FileName: entry.Name(),
			FileURL:  filepath.ToSlash(filepath.Join("/", fileaccess.BackupDirectoryName, entry.Name())),
		})
	}

	return GetAllBackups200JSONResponse(backups), nil
}

func (apiHandler) GetBackup(_ context.Context, _ GetBackupRequestObject) (GetBackupResponseObject, error) {
	return GetBackup200JSONResponse{}, nil
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

func (h apiHandler) writeBackup(ctx context.Context, name, filePath string, logger *slog.Logger, exportedData *models.BackupData) error {
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
		if err := writeToJSONFileInZip(writer, "metadata.json", metadata); err != nil {
			logger.ErrorContext(ctx, "Failed to write backup metadata to zip", "error", err)
			return err
		}

		// Write the database backup to JSON
		if err := writeToJSONFileInZip(writer, "database.json", exportedData); err != nil {
			logger.ErrorContext(ctx, "Failed to write backup data to zip", "error", err)
			return err
		}

		logger.DebugContext(ctx, "Copied backup data to zip")

		// Copy all uploads to the backup directory
		return fileaccess.CopyDirectoryToZip(h.fs, fileaccess.UploadDirectoryName, writer)
	})
}

func writeToJSONFileInZip(writer *zip.Writer, fileName string, data any) error {
	buf, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return fileaccess.WriteFileToZip(fileName, bytes.NewBuffer(buf), writer)
}

func (h apiHandler) getBackupMetadata(entry fs.DirEntry) (*models.BackupMetadata, error) {
	file, err := h.fs.Open(filepath.Join(fileaccess.BackupDirectoryName, entry.Name()))
	if err != nil {
		return nil, err
	}
	defer file.Close()

	ioReaderAt, ok := file.(io.ReaderAt)
	if !ok {
		// We have to create an adapter and potentially buffer the entire file in memory.
		// This is not ideal, but it should be rare since most file systems support io.ReaderAt.
		ioReaderAt = &unbufferedReaderAt{file, 0}
	}

	info, err := entry.Info()
	if err != nil {
		return nil, err
	}

	zipReader, err := zip.NewReader(ioReaderAt, info.Size())
	if err != nil {
		return nil, err
	}

	metadataFile, err := zipReader.Open("metadata.json")
	if err != nil {
		return nil, err
	}
	defer metadataFile.Close()

	metadataBytes, err := io.ReadAll(metadataFile)
	if err != nil {
		return nil, err
	}

	metadataContent := new(models.BackupMetadata)
	if err := json.Unmarshal(metadataBytes, metadataContent); err != nil {
		return nil, err
	}
	return metadataContent, nil
}

type unbufferedReaderAt struct {
	io.Reader

	offset int64
}

func (u *unbufferedReaderAt) ReadAt(p []byte, off int64) (int, error) {
	if off < u.offset {
		return 0, errors.New("invalid offset")
	}

	bytesWritten, err := io.CopyN(io.Discard, u.Reader, off-u.offset)
	u.offset += bytesWritten
	if err != nil {
		return 0, err
	}

	bytesRead, err := u.Reader.Read(p)
	u.offset += int64(bytesRead)
	return bytesRead, err
}
