package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/metadata"
)

func (apiHandler) GetInfo(_ context.Context, _ GetInfoRequestObject) (GetInfoResponseObject, error) {
	return GetInfo200JSONResponse{
		Version: &metadata.BuildVersion,
	}, nil
}

func (h apiHandler) GetConfiguration(_ context.Context, _ GetConfigurationRequestObject) (GetConfigurationResponseObject, error) {
	cfg, err := h.db.AppConfiguration().Read()
	if err != nil {
		fullErr := fmt.Errorf("reading application configuration: %w", err)
		return nil, fullErr
	}

	return GetConfiguration200JSONResponse(*cfg), nil
}

func (h apiHandler) SaveConfiguration(_ context.Context, request SaveConfigurationRequestObject) (SaveConfigurationResponseObject, error) {
	if err := h.db.AppConfiguration().Update(request.Body); err != nil {
		return nil, err
	}

	return SaveConfiguration204Response{}, nil
}
