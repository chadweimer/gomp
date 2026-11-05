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
	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/tasks"
)

const (
	backupFileNameTimeFormat = "2006-01-02T15-04-05.000Z"
	metadataFileName         = "metadata.json"
	databaseFileName         = "database.json"
)

func (h apiHandler) CreateBackup(ctx context.Context, request CreateBackupRequestObject) (CreateBackupResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	name := time.Now().Format(backupFileNameTimeFormat)

	// If the request includes file content, use it as the source for the backup instead of exporting from the database.
	// This allows for restoring from a backup by uploading the backup file as the content of the request.
	uploadedFileData, _, err := readFile(request.Body)
	if err == nil {
		backupFilePath, err := h.uploadBackup(ctx, logger, name, uploadedFileData, err)
		if err != nil {
			return CreateBackup400Response{}, nil
		}
		return CreateBackup201Response{
			Headers: CreateBackup201ResponseHeaders{
				Location: new(filepath.ToSlash(filepath.Join("/", backupFilePath))),
			},
		}, nil
	} else if !errors.Is(err, io.EOF) {
		logger.ErrorContext(ctx, "Failed to read uploaded backup file content", "error", err)
		return CreateBackup500Response{}, nil
	}

	if h.taskManager == nil {
		logger.ErrorContext(ctx, "Task manager is not configured")
		return CreateBackup500Response{}, nil
	}

	activeTasks, err := h.taskManager.List(ctx, tasks.TaskFilter{
		States: []models.TaskState{models.Running},
		Types:  []models.TaskType{models.TaskTypeBackup, models.TaskTypeRestore},
	})
	if err == nil && len(activeTasks) > 0 {
		logger.WarnContext(ctx, "A backup or restore task is already in progress")
		return CreateBackup409Response{}, nil
	}

	task, err := h.taskManager.Submit(models.TaskTypeBackup, func(taskCtx context.Context, report tasks.ProgressReporter) (map[string]any, error) {
		logger.DebugContext(taskCtx, "Starting background backup task", "name", name)
		report(10, "Exporting database data")

		exportedData, err := h.db.Backups().Export(taskCtx)
		if err != nil {
			logger.ErrorContext(taskCtx, "Failed to export backup data", "error", err)
			return nil, err
		}

		if taskCtx.Err() != nil {
			return nil, taskCtx.Err()
		}

		report(30, "Creating backup archive")
		backupFilePath := filepath.Join(fileaccess.BackupDirectoryName, fmt.Sprintf("gomp-backup-%s.zip", name))
		err = h.writeBackup(taskCtx, logger, name, backupFilePath, exportedData, report)
		if err != nil {
			logger.ErrorContext(taskCtx, "Failed to create backup file", "error", err, "file", backupFilePath)
			_ = h.fs.Delete(backupFilePath)
			return nil, err
		}

		location := filepath.ToSlash(filepath.Join("/", backupFilePath))
		return map[string]any{
			"location": location,
			"fileName": filepath.Base(backupFilePath),
		}, nil
	})
	if err != nil {
		if errors.Is(err, tasks.ErrConflict) {
			logger.WarnContext(ctx, "A backup or restore task is already in progress")
			return CreateBackup409Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to submit backup task", "error", err)
		return CreateBackup500Response{}, nil
	}

	location := fmt.Sprintf("/api/v1/tasks/%s", task.ID)
	return CreateBackup202JSONResponse{
		Body: *task,
		Headers: CreateBackup202ResponseHeaders{
			Location: &location,
		},
	}, nil
}

func (h apiHandler) GetBackups(ctx context.Context, _ GetBackupsRequestObject) (GetBackupsResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	backupFiles, err := h.fs.List(fileaccess.BackupDirectoryName)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to list contents of backup directory", "error", err)
		return GetBackups500Response{}, nil
	}

	backups := make([]models.Backup, 0, len(backupFiles))
	for _, entry := range backupFiles {
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

	return GetBackups200JSONResponse(backups), nil
}

func (h apiHandler) RestoreFromBackup(ctx context.Context, request RestoreFromBackupRequestObject) (RestoreFromBackupResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	// Validate the backup name to prevent path traversal attacks
	if !isNameSafe(request.Name) {
		logger.WarnContext(ctx, "invalid backup name", "name", request.Name)
		return RestoreFromBackup400Response{}, nil
	}

	backupFilePath := filepath.Join(fileaccess.BackupDirectoryName, request.Name)

	info, err := h.fs.Stat(backupFilePath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			logger.WarnContext(ctx, "Backup file to restore from does not exist", "name", request.Name)
			return RestoreFromBackup404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to stat backup file", "error", err, "name", request.Name)
		return RestoreFromBackup400Response{}, nil
	}
	if info.IsDir() {
		logger.ErrorContext(ctx, "Backup file is a directory", "name", request.Name)
		return RestoreFromBackup400Response{}, nil
	}

	// Pre-validate that the archive can be opened and contains valid metadata
	validationFile, err := h.fs.Open(filepath.Join(fileaccess.BackupDirectoryName, info.Name()))
	if err != nil {
		logger.ErrorContext(ctx, "Failed to open backup file for validation", "error", err, "name", request.Name)
		return RestoreFromBackup400Response{}, nil
	}
	defer validationFile.Close()

	err = fileaccess.ReadZip(validationFile, info.Size(), func(reader *zip.Reader) error {
		_, err := getMetadata(ctx, logger, reader, request.Name)
		return err
	})
	if err != nil {
		logger.ErrorContext(ctx, "Failed to validate backup archive", "error", err, "name", request.Name)
		return RestoreFromBackup400Response{}, nil
	}

	if h.taskManager == nil {
		logger.ErrorContext(ctx, "Task manager is not configured")
		return RestoreFromBackup500Response{}, nil
	}

	activeTasks, err := h.taskManager.List(ctx, tasks.TaskFilter{
		States: []models.TaskState{models.Running},
		Types:  []models.TaskType{models.TaskTypeBackup, models.TaskTypeRestore},
	})
	if err == nil && len(activeTasks) > 0 {
		logger.WarnContext(ctx, "A backup or restore task is already in progress")
		return RestoreFromBackup409Response{}, nil
	}

	backupName := request.Name
	task, err := h.taskManager.Submit(models.TaskTypeRestore, func(taskCtx context.Context, report tasks.ProgressReporter) (map[string]any, error) {
		logger.InfoContext(taskCtx, "Starting background database restore task", "name", backupName)
		report(10, "Validating backup archive")

		file, err := h.fs.Open(filepath.Join(fileaccess.BackupDirectoryName, info.Name()))
		if err != nil {
			logger.ErrorContext(taskCtx, "Failed to open backup archive", "error", err, "name", backupName)
			return nil, err
		}
		defer file.Close()

		err = fileaccess.ReadZip(file, info.Size(), func(reader *zip.Reader) error {
			_, err := getMetadata(taskCtx, logger, reader, backupName)
			if err != nil {
				return err
			}

			// FUTURE CHECK: Confirm version compatibility between the backup file and
			// the current application version before attempting to restore the database content.

			// Restore the database first. Since this is done in a transaction, if it fails,
			// the file copy won't be attempted and the database won't be left in a partially restored state.
			report(30, "Restoring database data")
			databaseData, err := readJSONFileFromZip[models.BackupData](reader, databaseFileName)
			if err != nil {
				logger.ErrorContext(taskCtx, "Failed to read backup data", "error", err, "name", backupName)
				return err
			}
			err = h.db.Backups().Import(taskCtx, databaseData)
			if err != nil {
				logger.ErrorContext(taskCtx, "Failed to import backup data", "error", err, "name", backupName)
				return err
			}

			// If the database restore succeeded, copy all the files from the backup to the upload directory.
			report(60, "Clearing existing media files")
			if err := h.fs.DeleteAll(fileaccess.UploadDirectoryName); err != nil {
				logger.ErrorContext(taskCtx, "Failed to delete upload directory", "error", err)
				return err
			}
			report(80, "Extracting media files from backup")
			err = fileaccess.CopyDirectoryFromZip(h.fs, fileaccess.UploadDirectoryName, fileaccess.UploadDirectoryName, reader)
			if err != nil {
				logger.ErrorContext(taskCtx, "Failed to copy files from backup", "error", err, "name", backupName)
				return err
			}

			report(100, "Restore completed successfully")
			return nil
		})
		if err != nil {
			logger.ErrorContext(taskCtx, "Failed to read backup zip file", "error", err, "name", backupName)
			return nil, err
		}

		return map[string]any{
			"backup": backupName,
		}, nil
	})
	if err != nil {
		if errors.Is(err, tasks.ErrConflict) {
			logger.WarnContext(ctx, "A backup or restore task is already in progress")
			return RestoreFromBackup409Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to submit restore task", "error", err)
		return RestoreFromBackup500Response{}, nil
	}

	location := fmt.Sprintf("/api/v1/tasks/%s", task.ID)
	return RestoreFromBackup202JSONResponse{
		Body: *task,
		Headers: RestoreFromBackup202ResponseHeaders{
			Location: &location,
		},
	}, nil
}

func (h apiHandler) DeleteBackup(ctx context.Context, request DeleteBackupRequestObject) (DeleteBackupResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	// Validate the backup name to prevent path traversal attacks
	if !isNameSafe(request.Name) {
		logger.WarnContext(ctx, "invalid backup name", "name", request.Name)
		return DeleteBackup400Response{}, nil
	}

	err := h.fs.Delete(filepath.Join(fileaccess.BackupDirectoryName, request.Name))
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			logger.WarnContext(ctx, "Backup file to delete does not exist", "name", request.Name)
			return DeleteBackup404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to delete backup file", "error", err, "name", request.Name)
		return DeleteBackup400Response{}, nil
	}
	return DeleteBackup204Response{}, nil
}

func (h apiHandler) uploadBackup(ctx context.Context, logger *slog.Logger, name string, uploadedFileData []byte, err error) (string, error) {
	logger.DebugContext(ctx, "Creating backup from uploaded file content")

	backupFileName := fmt.Sprintf("gomp-backup-upload-%s.zip", name)
	backupFilePath := filepath.Join(fileaccess.BackupDirectoryName, backupFileName)
	if err := h.fs.Save(backupFilePath, bytes.NewReader(uploadedFileData)); err != nil {
		logger.ErrorContext(ctx, "Failed to save uploaded backup file", "error", err, "file", backupFilePath)
		return "", err
	}

	info, err := h.fs.Stat(backupFilePath)
	if err != nil {
		return "", fmt.Errorf("failed to stat backup file: %w", err)
	}

	// Confirm this is a valid backup file by attempting to read it back
	file, err := h.fs.Open(filepath.Join(fileaccess.BackupDirectoryName, info.Name()))
	if err != nil {
		err = fmt.Errorf("failed to open backup file: %w", err)
	} else {
		defer file.Close()

		err = fileaccess.ReadZip(file, info.Size(), func(reader *zip.Reader) error {
			_, err := getMetadata(ctx, logger, reader, info.Name())
			return err
		})
		if err != nil {
			err = fmt.Errorf("failed to read backup file as zip: %w", err)
		}
	}
	if err != nil {
		logger.ErrorContext(ctx, "Uploaded backup failed. Cleaning up...", "error", err, "file", backupFilePath)

		// Always try to delete the file just created if it fails validation,
		// since it was uploaded by the user and we don't want to keep invalid backup files around.
		if innerErr := h.fs.Delete(backupFilePath); innerErr != nil {
			logger.ErrorContext(ctx, "Failed to delete invalid uploaded backup file", "error", innerErr, "file", backupFilePath)
		}
		return "", err
	}

	return backupFilePath, nil
}

func (h apiHandler) writeBackup(ctx context.Context, logger *slog.Logger, name, filePath string, exportedData *models.BackupData, report tasks.ProgressReporter) error {
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

		if ctx.Err() != nil {
			return ctx.Err()
		}

		// Write the database backup to JSON
		if err := writeJSONFileToZip(writer, "database.json", exportedData); err != nil {
			logger.ErrorContext(ctx, "Failed to write backup data to zip", "error", err)
			return err
		}

		if ctx.Err() != nil {
			return ctx.Err()
		}

		logger.DebugContext(ctx, "Copied backup data to zip")

		if report != nil {
			report(60, "Archiving uploaded media files")
		}

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
	sizeInBytes := info.Size()
	err = fileaccess.ReadZip(file, sizeInBytes, func(reader *zip.Reader) error {
		metadataContent, err := getMetadata(ctx, logger, reader, info.Name())
		if err != nil {
			return err
		}

		backup = models.Backup{
			SizeInBytes: &sizeInBytes,
			Metadata:    *metadataContent,
			FileName:    entry.Name(),
			FileURL:     filepath.ToSlash(filepath.Join("/", fileaccess.BackupDirectoryName, entry.Name())),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &backup, nil
}

func getMetadata(ctx context.Context, logger *slog.Logger, reader *zip.Reader, fileName string) (*models.BackupMetadata, error) {
	metadataContent, err := readJSONFileFromZip[models.BackupMetadata](reader, metadataFileName)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to read backup metadata", "error", err, "name", fileName)
		return nil, err
	}

	if !metadataContent.IsValid() {
		logger.ErrorContext(ctx, "Backup file has invalid metadata", "name", fileName, "metadata", metadataContent)
		return nil, errors.New("invalid backup metadata")
	}

	return metadataContent, nil
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
