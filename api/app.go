package api

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/models"
)

func (h *apiHandler) getAppConfiguration(resp http.ResponseWriter, req *http.Request) {
	cfg, err := h.db.AppConfiguration().Read()
	if err != nil {
		fullErr := fmt.Errorf("reading application configuration: %v", err)
		h.Error(resp, http.StatusInternalServerError, fullErr)
		return
	}

	h.OK(resp, cfg)
}

func (h *apiHandler) putAppConfiguration(resp http.ResponseWriter, req *http.Request) {
	var cfg models.AppConfiguration
	if err := readJSONFromRequest(req, &cfg); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.AppConfiguration().Update(&cfg); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
