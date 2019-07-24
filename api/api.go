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

// ApiHandler defines all the routes for the REST API layer
type ApiHandler struct {
	*render.Render

	cfg    *conf.Config
	upl    upload.Driver
	model  *models.Model
}

// New initializes a new instance of an ApiHandler
func New(renderer *render.Render, cfg *conf.Config, upl upload.Driver, model *models.Model) *ApiHandler {
	return &apiHandler {
		Render: renderer,

		cfg:   cfg,
		upl:   upl,
		model: model,
	}
}

// AddRoutes adds all the needed API routes to the provided RouterGroup
func (h *ApiHandler) AddRoutes(r *router.RouterGroup) {
	r.Group("/v1", func(v1 *router.RouterGroup) {
		// Everything within this group doesn't require authentication
		v1.GET("/app/configuration", h.getAppConfiguration)
		v1.POST("/auth", h.postAuthenticate)

		v1.Group("", func(private *router.RouterGroup) {
			// Everything within this group requires authentication
			private.Use(h.requireAuthentication)

			private.Group("/recipes", func(recipes *router.RouterGroup) {
				recipes.GET("", h.getRecipes)
				recipes.POST("", h.postRecipe)

				recipes.Group("/:recipeID", func(recipe *router.RouterGroup) {
					recipe.GET("", h.getRecipe)
					recipe.PUT("", h.putRecipe)
					recipe.DELETE("", h.deleteRecipe)
					recipe.PUT("/rating", h.putRecipeRating)
					recipe.GET("/image", h.getRecipeMainImage)
					recipe.PUT("/image", h.putRecipeMainImage)
					recipe.GET("/images", h.getRecipeImages)
					recipe.POST("/images", h.postRecipeImage)
					recipe.GET("/notes", h.getRecipeNotes)
					recipe.GET("/links", h.getRecipeLinks)
					recipe.POST("/links", h.postRecipeLink)
					recipe.DELETE("/links/:destRecipeID", h.deleteRecipeLink)
				})
			})

			private.Group("/notes", func(notes *router.RouterGroup) {
				notes.POST("", h.postNote)
				notes.PUT("/:noteID", h.putNote)
				notes.DELETE("/:noteID", h.deleteNote)
			})

			private.Group("/users", func(users *router.RouterGroup) {
				users.GET("/:userID", h.getUser)
				users.PUT("/:userID/password", h.putUserPassword)
				users.GET("/:userID/settings", h.getUserSettings)
				users.PUT("/:userID/settings", h.putUserSettings)
			})

			private.DELETE("/images/:imageID", h.deleteImage)
			private.GET("/tags", h.getTags)
			private.POST("/uploads", h.postUpload)
		})
	})
	//r.NotFound = http.HandlerFunc(h.notFound)
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
