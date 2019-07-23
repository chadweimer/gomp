package router

import (
	"github.com/julienschmidt/httprouter"
)

type Router struct {
	*httprouter.Router
	*RouterGroup
}

func New() *Router {
	hr := httprouter.New()
	rg := &RouterGroup {
		hr: hr,
	}
	return &Router {
		Router: hr,
		RouterGroup: rg,
	}
}

func (r *RouterGroup) Handle(method, path string, handle httprouter.Handle) {
	fullPath := path
	if len(r.prefix) > 0 {
		fullPath = r.prefix + path
	}
	r.hr.Handle(method, fullPath, handle)
}

func (r *RouterGroup) GET(path string, handle httprouter.Handle) { r.Handle("GET", path, handle) }
func (r *RouterGroup) PUT(path string, handle httprouter.Handle) { r.Handle("PUT", path, handle) }
func (r *RouterGroup) POST(path string, handle httprouter.Handle) { r.Handle("POST", path, handle) }
func (r *RouterGroup) DELETE(path string, handle httprouter.Handle) { r.Handle("DELETE", path, handle) }

type RouterGroup struct {
	hr *httprouter.Router
	prefix string
}

func (r *RouterGroup) Group(path string) *RouterGroup {
	return &RouterGroup {
		hr:     r.hr,
		prefix: path,
	}
}
