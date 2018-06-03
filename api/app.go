package api

import (
	"net/http"

	"github.com/chadweimer/gomp/models"

	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getAppConfiguration(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	appConfiguration := models.AppConfiguration{
		Title: h.cfg.ApplicationTitle,
	}

	h.JSON(resp, http.StatusOK, appConfiguration)
}
