package api

import (
	"context"
	"encoding/json"
	"path/filepath"
	"time"
)

func (h apiHandler) CreateBackup(_ context.Context, _ CreateBackupRequestObject) (CreateBackupResponseObject, error) {
	exportedRecipes, err := h.db.Backups().ExportRecipes()
	if err != nil {
		return nil, err
	}

	// Generate a directory name based on the current timestamp in UTC
	timestamp := time.Now().Format("2006-01-02T15-04-05.000Z")
	dirPath := filepath.Join("backups", timestamp)

	// Marshal the exported recipes to JSON
	buf, err := json.MarshalIndent(exportedRecipes, "", "  ")
	if err != nil {
		return nil, err
	}

	// Write the backup to a file
	exportedRecipesFile := filepath.Join(dirPath, "recipes.json")
	if err := h.upl.Driver.Save(exportedRecipesFile, buf); err != nil {
		return nil, err
	}

	// Copy all uploads to the backup directory
	h.fs.CopyAll("uploads", filepath.Join(dirPath, "uploads"))

	// TODO: Give back the location of the backup
	return CreateBackup201Response{}, nil
}

func (apiHandler) GetAllBackups(_ context.Context, _ GetAllBackupsRequestObject) (GetAllBackupsResponseObject, error) {
	return GetAllBackups200Response{}, nil
}

func (apiHandler) GetBackup(_ context.Context, _ GetBackupRequestObject) (GetBackupResponseObject, error) {
	return GetBackup200ApplicationGzipResponse{}, nil
}
