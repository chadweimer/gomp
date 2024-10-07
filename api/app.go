package api

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/metadata"
)

func (apiHandler) GetInfo(_ context.Context, _ GetInfoRequestObject) (GetInfoResponseObject, error) {
	return GetInfo200JSONResponse{
		Copyright: &metadata.Copyright,
		Version:   &metadata.BuildVersion,
	}, nil
}

func (h apiHandler) GetConfiguration(_ context.Context, _ GetConfigurationRequestObject) (GetConfigurationResponseObject, error) {
	cfg, err := h.db.AppConfiguration().Read()
	if err != nil {
		return nil, fmt.Errorf("reading application configuration: %w", err)
	}

	return GetConfiguration200JSONResponse(*cfg), nil
}

func (h apiHandler) SaveConfiguration(_ context.Context, request SaveConfigurationRequestObject) (SaveConfigurationResponseObject, error) {
	if err := h.db.AppConfiguration().Update(request.Body); err != nil {
		return nil, err
	}

	return SaveConfiguration204Response{}, nil
}
