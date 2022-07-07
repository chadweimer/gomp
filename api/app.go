package api

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/gomp/models"
)

func (h apiHandler) GetInfo(w http.ResponseWriter, r *http.Request) {
	info := models.AppInfo{
		Version: &metadata.BuildVersion,
	}

	h.OK(w, r, info)
}

func (h apiHandler) GetConfiguration(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.db.AppConfiguration().Read()
	if err != nil {
		fullErr := fmt.Errorf("reading application configuration: %w", err)
		h.Error(w, r, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(w, r, cfg)
}

func (h apiHandler) SaveConfiguration(w http.ResponseWriter, r *http.Request) {
	var cfg models.AppConfiguration
	if err := readJSONFromRequest(r, &cfg); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	if err := h.db.AppConfiguration().Update(&cfg); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}
