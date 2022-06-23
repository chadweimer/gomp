package api

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/generated/models"
	"github.com/chadweimer/gomp/metadata"
)

func (h apiHandler) GetInfo(resp http.ResponseWriter, req *http.Request) {
	info := models.AppInfo{
		Version: &metadata.BuildVersion,
	}

	h.OK(resp, info)
}

func (h apiHandler) GetConfiguration(resp http.ResponseWriter, req *http.Request) {
	cfg, err := h.db.AppConfiguration().Read()
	if err != nil {
		fullErr := fmt.Errorf("reading application configuration: %v", err)
		h.Error(resp, req, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(resp, cfg)
}

func (h apiHandler) SaveConfiguration(resp http.ResponseWriter, req *http.Request) {
	var cfg models.AppConfiguration
	if err := readJSONFromRequest(req, &cfg); err != nil {
		h.Error(resp, req, http.StatusBadRequest, err)
		return
	}

	if err := h.db.AppConfiguration().Update(&cfg); err != nil {
		h.Error(resp, req, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
