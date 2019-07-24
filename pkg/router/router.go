package router

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// Router is an expansion of httrouter.Router that procides grouping and middleware support
type Router struct {
	*httprouter.Router
}

// RouterGroup is a group within a Router whose routes and sub-groups inherit its sub-path
type RouterGroup struct {
	parent      *Router
	pathPrefix  string
	middlewares []Middleware
}

// Middleware is a function that allows adding functionality to a RouterGroup
// that applies to all routes and sub-groups within it.
type Middleware func(httprouter.Handle) httprouter.Handle

// New creates a new Router with default values
func New() *Router {
	return &Router {
		Router: httprouter.New()
	}
}

// NewGroup creates a new group with the specified path as a prefix
// for all routes and sub-groups.
func (r *RouterGroup) NewGroup(path string) *RouterGroup {
	// Make sure we have a copy of the middleware slice so that
	// additions in the sub-group don't affect the original
	copyOfMiddlewares = make([]Middleware, len(r.middlewares))
	copy(copyOfMiddlewares, r.middlewares)

	return &RouterGroup {
		root:        r,
		pathPrefix:  buildFullPath(r.pathPrefix, path),
		middlewares: copyOfMiddlewares,
	}
}

func (r *RouterGroup) Group(path string, group func(*RouterGroup)) {
	g := r.NewGroup(path)
	group(g)
}

func (r *RouterGroup) Use(middleware Middleware) {
	r.middlewares = append(r.middlewares, middleware)
}

func (r *RouterGroup) Handle(method, path string, handle httprouter.Handle) {
	r.root.Handle(method, buildFullPath(r.pathPrefix, path), combineMiddleware(handle, r.middlewares))
}

func (r *RouterGroup) GET(path string, handle httprouter.Handle) { r.Handle("GET", path, handle) }
func (r *RouterGroup) PUT(path string, handle httprouter.Handle) { r.Handle("PUT", path, handle) }
func (r *RouterGroup) POST(path string, handle httprouter.Handle) { r.Handle("POST", path, handle) }
func (r *RouterGroup) DELETE(path string, handle httprouter.Handle) { r.Handle("DELETE", path, handle) }

func buildFullPath(pathPrefix, path string) {
	if pathPrefix != nil && len(pathPrefix) > 0 {
		return pathPrefix + path
	}
	return path
}

func combineMiddleware(h httpRouter.Handle, middlewares ...Middleware) httpRouter.Handle {
	for i := len(middlewares)-1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}