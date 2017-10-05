package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type ApplicationSettings struct {
	Title        string `json:"title"`
	HomeImageURL string `json:"home_image_url"`
}

func (h apiHandler) getAppSettings(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	settings := ApplicationSettings{
		Title:        h.cfg.ApplicationTitle,
		HomeImageURL: h.cfg.HomeImage,
	}

	h.JSON(resp, http.StatusOK, settings)
}
