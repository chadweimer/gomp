package routers

import (
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"github.com/chadweimer/gomp/modules/conf"
	"gopkg.in/unrolled/render.v1"
)

var rend = render.New(render.Options{
	Layout: "shared/layout",
	Funcs: []template.FuncMap{map[string]interface{}{
		"ToLower": strings.ToLower,
		"Add": func(a, b int64) int64 {
			return a + b
		},
		"RootUrlPath": conf.RootURLPath,
	}}})

// RedirectIfHasError sends the request to the InternalServerError page
// if the asupplied error is not nil
func RedirectIfHasError(resp http.ResponseWriter, err error) bool {
	if err != nil {
		fmt.Println(err)
		InternalServerError(resp, err)
		return true
	}
	return false
}
