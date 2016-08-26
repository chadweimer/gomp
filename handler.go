package main

import (
	"fmt"
	"net/http"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/modules/upload"
	"github.com/julienschmidt/httprouter"
	"gopkg.in/unrolled/render.v1"
)

type uiHandler struct {
	cfg   *conf.Config
	uiMux *httprouter.Router
	*render.Render
}

func newUIHandler(cfg *conf.Config, renderer *render.Render) http.Handler {
	h := uiHandler{
		cfg:    cfg,
		Render: renderer,
	}

	h.uiMux = httprouter.New()
	h.uiMux.ServeFiles("/static/*filepath", http.Dir("static"))
	if h.cfg.UploadDriver == "fs" {
		h.uiMux.ServeFiles("/uploads/*filepath", http.Dir(h.cfg.UploadPath))
	} else if h.cfg.UploadDriver == "s3" {
		h.uiMux.GET("/uploads/*filepath", upload.HandleS3Uploads(h.cfg.UploadPath))
	}
	h.uiMux.NotFound = http.HandlerFunc(h.notFound)
	h.uiMux.PanicHandler = h.handlePanic

	return h.uiMux
}

func (h uiHandler) servePage(templateName string) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		h.HTML(resp, http.StatusOK, templateName, nil)
	}
}

func (h uiHandler) notFound(resp http.ResponseWriter, req *http.Request) {
	h.showError(resp, http.StatusNotFound, nil)
}

func (h uiHandler) handlePanic(resp http.ResponseWriter, req *http.Request, data interface{}) {
	h.showError(resp, http.StatusInternalServerError, data)
}

func (h uiHandler) showError(resp http.ResponseWriter, status int, data interface{}) {
	h.HTML(resp, status, fmt.Sprintf("status/%d", status), data)
}
