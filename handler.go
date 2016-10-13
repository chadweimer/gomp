package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/chadweimer/gomp/modules/conf"
	"github.com/chadweimer/gomp/modules/upload"
	"github.com/julienschmidt/httprouter"
	"gopkg.in/unrolled/render.v1"
)

type justFilesFilesystem struct {
	fs http.FileSystem
}

func (fs justFilesFilesystem) Open(name string) (http.File, error) {
	f, err := fs.fs.Open(name)
	if err != nil {
		fmt.Printf("Error opening file %s. Error = %s", name, err.Error())
		return nil, err
	}

	stat, err := f.Stat()
	if stat.IsDir() {
		fmt.Printf("%s is a directory.", name)
		return nil, os.ErrPermission
	}

	return f, nil
}

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
	if cfg.IsDevelopment {
		h.uiMux.ServeFiles("/static/*filepath", justFilesFilesystem{http.Dir("static/")})
	} else {
		h.uiMux.ServeFiles("/static/*filepath", justFilesFilesystem{http.Dir("static/build/bundled/")})
	}
	if h.cfg.UploadDriver == "fs" {
		h.uiMux.ServeFiles("/uploads/*filepath", justFilesFilesystem{http.Dir(h.cfg.UploadPath)})
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
