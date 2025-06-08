package api

import (
	"context"
)

func (apiHandler) CreateBackup(_ context.Context, _ CreateBackupRequestObject) (CreateBackupResponseObject, error) {
	return CreateBackup201Response{}, nil
}

func (apiHandler) GetAllBackups(_ context.Context, _ GetAllBackupsRequestObject) (GetAllBackupsResponseObject, error) {
	return GetAllBackups200Response{}, nil
}

func (apiHandler) GetBackup(_ context.Context, _ GetBackupRequestObject) (GetBackupResponseObject, error) {
	return GetBackup200ApplicationGzipResponse{}, nil
}
