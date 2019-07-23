package api

import (
	"encoding/json"
	"errors"
//	"fmt"
	"net/http"
	"net/url"

	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/pkg/router"
	"github.com/chadweimer/gomp/upload"
	"github.com/unrolled/render"
)

// ---- Begin Standard Errors ----

var errMismatchedNoteID = errors.New("The note id in the path does not match the one specified in the request body")
var errMismatchedRecipeID = errors.New("The recipe id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

type apiHandler struct {
	*render.Render

	r      *router.RouterGroup
	cfg    *conf.Config
	upl    upload.Driver
	model  *models.Model
}

// AddRoutes adds all the needed API routes to the provided RouterGroup
func AddRoutes(r *router.RouterGroup, renderer *render.Render, cfg *conf.Config, upl upload.Driver, model *models.Model) {
	h := apiHandler{
		Render: renderer,

		r:     r,
		cfg:   cfg,
		upl:   upl,
		model: model,
	}

	h.r.GET("/v1/app/configuration", h.getAppConfiguration)
	h.r.POST("/v1/auth", h.postAuthenticate)
	h.r.GET("/v1/recipes", h.requireAuthentication(h.getRecipes))
	h.r.POST("/v1/recipes", h.requireAuthentication(h.postRecipe))
	h.r.GET("/v1/recipes/:recipeID", h.requireAuthentication(h.getRecipe))
	h.r.PUT("/v1/recipes/:recipeID", h.requireAuthentication(h.putRecipe))
	h.r.DELETE("/v1/recipes/:recipeID", h.requireAuthentication(h.deleteRecipe))
	h.r.PUT("/v1/recipes/:recipeID/rating", h.requireAuthentication(h.putRecipeRating))
	h.r.GET("/v1/recipes/:recipeID/image", h.requireAuthentication(h.getRecipeMainImage))
	h.r.PUT("/v1/recipes/:recipeID/image", h.requireAuthentication(h.putRecipeMainImage))
	h.r.GET("/v1/recipes/:recipeID/images", h.requireAuthentication(h.getRecipeImages))
	h.r.POST("/v1/recipes/:recipeID/images", h.requireAuthentication(h.postRecipeImage))
	h.r.GET("/v1/recipes/:recipeID/notes", h.requireAuthentication(h.getRecipeNotes))
	h.r.GET("/v1/recipes/:recipeID/links", h.requireAuthentication(h.getRecipeLinks))
	h.r.POST("/v1/recipes/:recipeID/links", h.requireAuthentication(h.postRecipeLink))
	h.r.DELETE("/v1/recipes/:recipeID/links/:destRecipeID", h.requireAuthentication(h.deleteRecipeLink))
	h.r.DELETE("/v1/images/:imageID", h.requireAuthentication(h.deleteImage))
	h.r.POST("/v1/notes", h.requireAuthentication(h.postNote))
	h.r.PUT("/v1/notes/:noteID", h.requireAuthentication(h.putNote))
	h.r.DELETE("/v1/notes/:noteID", h.requireAuthentication(h.deleteNote))
	h.r.GET("/v1/tags", h.requireAuthentication(h.getTags))
	h.r.GET("/v1/users/:userID", h.requireAuthentication(h.getUser))
	h.r.PUT("/v1/users/:userID/password", h.requireAuthentication(h.putUserPassword))
	h.r.GET("/v1/users/:userID/settings", h.requireAuthentication(h.getUserSettings))
	h.r.PUT("/v1/users/:userID/settings", h.requireAuthentication(h.putUserSettings))
	h.r.POST("/v1/uploads", h.requireAuthentication(h.postUpload))
	//h.r.NotFound = http.HandlerFunc(h.notFound)
}

//func (h apiHandler) notFound(resp http.ResponseWriter, req *http.Request) {
//	h.JSON(resp, http.StatusNotFound, fmt.Sprintf("%s is not a valid API endpoint", req.URL.Path))
//}

func getParam(values url.Values, key string) string {
	val, _ := url.QueryUnescape(values.Get(key))
	return val
}

func getParams(values url.Values, key string) []string {
	var vals []string
	var ok bool
	if vals, ok = values[key]; ok {
		for i, val := range vals {
			vals[i], _ = url.QueryUnescape(val)
		}
	}

	return vals
}

func readJSONFromRequest(req *http.Request, data interface{}) error {
	return json.NewDecoder(req.Body).Decode(data)
}
