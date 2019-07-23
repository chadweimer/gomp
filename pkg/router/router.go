package router

import (
	"net/http"

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
	// Build out the full route path from the prefix
	fullPath := path
	if len(r.prefix) > 0 {
		fullPath = r.prefix + path
	}

	// TODO: Attach all the middlewares

	r.hr.Handle(method, fullPath, handle)
}

func (r *RouterGroup) GET(path string, handle httprouter.Handle) { r.Handle("GET", path, handle) }
func (r *RouterGroup) PUT(path string, handle httprouter.Handle) { r.Handle("PUT", path, handle) }
func (r *RouterGroup) POST(path string, handle httprouter.Handle) { r.Handle("POST", path, handle) }
func (r *RouterGroup) DELETE(path string, handle httprouter.Handle) { r.Handle("DELETE", path, handle) }

type GroupFunc func(*RouterGroup)
type Middleware func(http.ResponseWriter, *http.Request, Middleware)

type RouterGroup struct {
	hr *httprouter.Router
	prefix string
	middlewares []Middleware
}

func (r *RouterGroup) NewGroup(path string) *RouterGroup {
	fullPath := path
	if len(r.prefix) > 0 {
		fullPath = r.prefix + path
	}
	return &RouterGroup {
		hr:     r.hr,
		prefix: fullPath,
		// TODO: Need to make a fopy
		middlewares: r.middlewares,
	}
}

func (r *RouterGroup) Group(path string, group GroupFunc) {
	g := r.NewGroup(path)
	group(g)
}

func(r *RouterGroup) Use(m Middleware) {
	r.middlewares = append(r.middlewares, m)
}
