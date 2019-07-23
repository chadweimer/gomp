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

type GroupFunc func(*RouterGroup)

type RouterGroup struct {
	hr *httprouter.Router
	prefix string
}

func (r *RouterGroup) NewGroup(path string) *RouterGroup {
	fullPath := path
	if len(r.prefix) > 0 {
		fullPath = r.prefix + path
	}
	return &RouterGroup {
		hr:     r.hr,
		prefix: fullPath,
	}
}

func (r *RouterGroup) Group(path string, group GroupFunc) {
	g := r.NewGroup(path)
	group(g)
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

type MiddlewareFunc func(rw http.ResponseWriter, r *http.Request, next func(rw http.ResponseWriter, r *http.Request))

type middleware struct {
	handler MiddlewareFunc
	next func(rw http.ResponseWriter, r *http.Request)
}

func (m middleware) Handler(rw http.ResponseWriter, r *http.Request) {
	m.handler(rw, r, m.next)
}

func(r *RouterGroup) Use(f MiddlwareFunc) {
	// TODO: Build middleware chain
}

func (r *RouterGroup) GET(path string, handle httprouter.Handle) { r.Handle("GET", path, handle) }
func (r *RouterGroup) PUT(path string, handle httprouter.Handle) { r.Handle("PUT", path, handle) }
func (r *RouterGroup) POST(path string, handle httprouter.Handle) { r.Handle("POST", path, handle) }
func (r *RouterGroup) DELETE(path string, handle httprouter.Handle) { r.Handle("DELETE", path, handle) }
