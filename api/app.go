package api

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/rs/zerolog/log"
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

func (h apiHandler) PerformMaintenance(w http.ResponseWriter, r *http.Request) {
	var req AppMaintenanceRequest
	if err := readJSONFromRequest(r, &req); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	switch req.Op {
	case OptimizeImages:
		h.optimizeImages(w, r)
	default:
		h.Error(w, r, http.StatusBadRequest, fmt.Errorf("Invalid operation: '%s'", req.Op))
		return
	}
}

func (h apiHandler) optimizeImages(w http.ResponseWriter, r *http.Request) {
	recipes, err := h.db.Recipes().List()
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	for _, recipe := range *recipes {
		// Get all the images for the recipe
		images, err := h.db.Images().List(*recipe.Id)
		if err != nil {
			h.Error(w, r, http.StatusInternalServerError, err)
			return
		}

		for _, image := range *images {
			// Load the current original
			log.Debug().Msgf("Loading %s", *image.Url)
			data, err := upload.Load(h.upl, *recipe.Id, *image.Name)
			if err != nil {
				h.Error(w, r, http.StatusInternalServerError, err)
				return
			}

			// Resave it, which will downscale if larger than the threshold,
			// as well as regenerate the thumbnail
			log.Debug().Msgf("Re-saving %s", *image.Url)
			upload.Save(h.upl, *recipe.Id, *image.Name, data)
			if err != nil {
				h.Error(w, r, http.StatusInternalServerError, err)
				return
			}
		}
	}

	h.NoContent(w)
}
