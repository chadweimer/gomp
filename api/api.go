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
		v1.DELETE("/images/:imageID", h.requireAuthentication(h.deleteImage))
		v1.GET("/tags", h.requireAuthentication(h.getTags))
		v1.Group("/recipes", func(recipes *router.RouterGroup) {
			recipes.GET("", h.requireAuthentication(h.getRecipes))
			recipes.POST("", h.requireAuthentication(h.postRecipe))
			recipes.Group("/:recipeID", func(recipe *router.RouterGroup) {
				recipe.GET("", h.requireAuthentication(h.getRecipe))
				recipe.PUT("", h.requireAuthentication(h.putRecipe))
				recipe.DELETE("", h.requireAuthentication(h.deleteRecipe))
				recipe.PUT("/rating", h.requireAuthentication(h.putRecipeRating))
				recipe.GET("/image", h.requireAuthentication(h.getRecipeMainImage))
				recipe.PUT("/image", h.requireAuthentication(h.putRecipeMainImage))
				recipe.GET("/images", h.requireAuthentication(h.getRecipeImages))
				recipe.POST("/images", h.requireAuthentication(h.postRecipeImage))
				recipe.GET("/notes", h.requireAuthentication(h.getRecipeNotes))
				recipe.GET("/links", h.requireAuthentication(h.getRecipeLinks))
				recipe.POST("/links", h.requireAuthentication(h.postRecipeLink))
				recipe.DELETE("/links/:destRecipeID", h.requireAuthentication(h.deleteRecipeLink))
			})
		})
		v1.Group("/notes", func(notes *router.RouterGroup) {
			notes.POST("", h.requireAuthentication(h.postNote))
			notes.PUT("/:noteID", h.requireAuthentication(h.putNote))
			notes.DELETE("/:noteID", h.requireAuthentication(h.deleteNote))
		})
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
