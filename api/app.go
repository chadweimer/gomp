package api

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/metadata"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
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
		allStates := make([]models.RecipeState, 2)
		allStates = append(allStates, models.Active)
		allStates = append(allStates, models.Archived)
		allFilter := models.SearchFilter{
			Query:        "",
			Fields:       make([]models.SearchField, 0),
			Tags:         make([]string, 0),
			WithPictures: nil,
			States:       allStates,
			SortBy:       models.SortById,
			SortDir:      models.Asc,
		}
		// TODO: Paging?
		allRecipes, _, err := h.db.Recipes().Find(&allFilter, 1, 1000000)
		if err != nil {
			h.Error(w, r, http.StatusInternalServerError, err)
			return
		}
		for _, recipe := range *allRecipes {
			err = upload.OptimizeImages(h.upl, *recipe.Id)
			if err != nil {
				// TODO: Log and continue?
				h.Error(w, r, http.StatusInternalServerError, err)
				return
			}
		}
	default:
	}

	h.NoContent(w)
}
