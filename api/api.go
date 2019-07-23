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

	h.r.Group("/v1", func(v1 *router.RouterGroup) {
		v1.GET("/app/configuration", h.getAppConfiguration)
		v1.POST("/auth", h.postAuthenticate)
		v1.GET("/recipes", h.requireAuthentication(h.getRecipes))
		v1.POST("/recipes", h.requireAuthentication(h.postRecipe))
		v1.GET("/recipes/:recipeID", h.requireAuthentication(h.getRecipe))
		v1.PUT("/recipes/:recipeID", h.requireAuthentication(h.putRecipe))
		v1.DELETE("/recipes/:recipeID", h.requireAuthentication(h.deleteRecipe))
		v1.PUT("/recipes/:recipeID/rating", h.requireAuthentication(h.putRecipeRating))
		v1.GET("/recipes/:recipeID/image", h.requireAuthentication(h.getRecipeMainImage))
		v1.PUT("/recipes/:recipeID/image", h.requireAuthentication(h.putRecipeMainImage))
		v1.GET("/recipes/:recipeID/images", h.requireAuthentication(h.getRecipeImages))
		v1.POST("/recipes/:recipeID/images", h.requireAuthentication(h.postRecipeImage))
		v1.GET("/recipes/:recipeID/notes", h.requireAuthentication(h.getRecipeNotes))
		v1.GET("/recipes/:recipeID/links", h.requireAuthentication(h.getRecipeLinks))
		v1.POST("/recipes/:recipeID/links", h.requireAuthentication(h.postRecipeLink))
		v1.DELETE("/recipes/:recipeID/links/:destRecipeID", h.requireAuthentication(h.deleteRecipeLink))
		v1.DELETE("/images/:imageID", h.requireAuthentication(h.deleteImage))
		v1.POST("/notes", h.requireAuthentication(h.postNote))
		v1.PUT("/notes/:noteID", h.requireAuthentication(h.putNote))
		v1.DELETE("/notes/:noteID", h.requireAuthentication(h.deleteNote))
		v1.GET("/tags", h.requireAuthentication(h.getTags))
		v1.Group("/users", func(users *router.RouterGroup) {
			users.GET("/:userID", h.requireAuthentication(h.getUser))
			users.PUT("/:userID/password", h.requireAuthentication(h.putUserPassword))
			users.GET("/:userID/settings", h.requireAuthentication(h.getUserSettings))
			users.PUT("/:userID/settings", h.requireAuthentication(h.putUserSettings))
		})
		v1.POST("/uploads", h.requireAuthentication(h.postUpload))
	})
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
