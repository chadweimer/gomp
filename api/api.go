// Package api GOMP: Go Meal Planner
//
// REST API for the application
//
// Schemes: http, https
// Host: localhost
// BasePath: /api/v1
// Version: 0.1.0
// License: MIT http://opensource.org/licenses/MIT
//
// Consumes:
// - application/json
//
// Produces:
// - application/json
//
// swagger:meta
package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/julienschmidt/httprouter"
	"github.com/unrolled/render"
)

// ---- Begin Standard Errors ----

var errMismatchedNoteID = errors.New("The note id in the path does not match the one specified in the request body")
var errMismatchedRecipeID = errors.New("The recipe id in the path does not match the one specified in the request body")

// ---- End Standard Errors ----

type apiHandler struct {
	*render.Render

	cfg    *conf.Config
	upl    upload.Driver
	model  *models.Model
	apiMux *httprouter.Router
}

// NewHandler returns a new instance of http.Handler
func NewHandler(renderer *render.Render, cfg *conf.Config, upl upload.Driver, model *models.Model) http.Handler {
	h := apiHandler{
		Render: renderer,

		cfg:   cfg,
		upl:   upl,
		model: model,
	}

	h.apiMux = httprouter.New()
	// swagger:operation GET /app/configuration getAppConfiguration
	//
	// ---
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       "$ref": "#/definitions/appConfiguration"
	h.apiMux.GET("/api/v1/app/configuration", h.getAppConfiguration)
	// swagger:operation POST /auth postAuthenticate
	//
	// ---
	// parameters:
	// - name: credentials
	//   in: body
	//   required: true
	//   schema:
	//     "$ref": "#/definitions/authenticateRequest"
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       "$ref": "#/definitions/authenticateResponse"
	h.apiMux.POST("/api/v1/auth", h.postAuthenticate)
	// swagger:operation GET /recipes getRecipes
	//
	// ---
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       "$ref": "#/definitions/getRecipesResponse"
	h.apiMux.GET("/api/v1/recipes", h.requireAuthentication(h.getRecipes))
	// swagger:operation POST /recipes postRecipe
	//
	// ---
	// parameters:
	// - name: recipe
	//   in: body
	//   required: true
	//   schema:
	//     "$ref": "#/definitions/recipe"
	// responses:
	//   201:
	//     description: Created
	//     headers:
	//       Location:
	//         description: The url of the newly created resource
	//         type: string
	h.apiMux.POST("/api/v1/recipes", h.requireAuthentication(h.postRecipe))
	// swagger:operation GET /recipes/{id} getRecipe
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       "$ref": "#/definitions/recipe"
	h.apiMux.GET("/api/v1/recipes/:recipeID", h.requireAuthentication(h.getRecipe))
	// swagger:operation PUT /recipes/{id} putRecipe
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: recipe
	//   in: body
	//   required: true
	//   schema:
	//     "$ref": "#/definitions/recipe"
	// responses:
	//   204:
	//     description: Modified
	h.apiMux.PUT("/api/v1/recipes/:recipeID", h.requireAuthentication(h.putRecipe))
	// swagger:operation DELETE /recipes/{id} deleteRecipe
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Deleted
	h.apiMux.DELETE("/api/v1/recipes/:recipeID", h.requireAuthentication(h.deleteRecipe))
	// swagger:operation PUT /recipes/{id}/rating putRecipeRating
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: rating
	//   in: body
	//   required: true
	//   schema:
	//     type: integer
	// responses:
	//   204:
	//     description: Modified
	h.apiMux.PUT("/api/v1/recipes/:recipeID/rating", h.requireAuthentication(h.putRecipeRating))
	// swagger:operation GET /recipes/{id}/image getRecipeMainImage
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       "$ref": "#/definitions/recipeImage"
	h.apiMux.GET("/api/v1/recipes/:recipeID/image", h.requireAuthentication(h.getRecipeMainImage))
	// swagger:operation PUT /recipes/{id}/image putRecipeMainImage
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: imageId
	//   in: body
	//   required: true
	//   schema:
	//     type: integer
	// responses:
	//   204:
	//     description: Modified
	h.apiMux.PUT("/api/v1/recipes/:recipeID/image", h.requireAuthentication(h.putRecipeMainImage))
	// swagger:operation GET /recipes/{id}/images getRecipeImages
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       type: array
	//       items:
	//         "$ref": "#/definitions/recipeImage"
	h.apiMux.GET("/api/v1/recipes/:recipeID/images", h.requireAuthentication(h.getRecipeImages))
	// swagger:operation POST /recipes/{id}/images postRecipeImage
	//
	// ---
	// consumes:
	// - multipart/form-data
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: file
	//   in: formData
	//   required: true
	//   type: file
	// responses:
	//   201:
	//     description: Created
	//     headers:
	//       Location:
	//         description: The url of the newly created resource
	//         type: string
	h.apiMux.POST("/api/v1/recipes/:recipeID/images", h.requireAuthentication(h.postRecipeImage))
	// swagger:operation GET /recipes/{id}/notes getRecipeNotes
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       type: array
	//       items:
	//         "$ref": "#/definitions/note"
	h.apiMux.GET("/api/v1/recipes/:recipeID/notes", h.requireAuthentication(h.getRecipeNotes))
	// swagger:operation GET /recipes/{id}/links getRecipeLinks
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       type: array
	//       items:
	//         "$ref": "#/definitions/recipe"
	h.apiMux.GET("/api/v1/recipes/:recipeID/links", h.requireAuthentication(h.getRecipeLinks))
	// swagger:operation POST /recipes/{id}/links postRecipeLink
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: destRecipeId
	//   in: body
	//   required: true
	//   schema:
	//     type: integer
	// responses:
	//   201:
	//     description: Created
	//     headers:
	//       Location:
	//         description: The url of the newly created resource
	//         type: string
	h.apiMux.POST("/api/v1/recipes/:recipeID/links", h.requireAuthentication(h.postRecipeLink))
	// swagger:operation DELETE /recipes/{id}/links/{destRecipeId} deleteRecipeLink
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: destRecipeId
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Deleted
	h.apiMux.DELETE("/api/v1/recipes/:recipeID/links/:destRecipeID", h.requireAuthentication(h.deleteRecipeLink))
	// swagger:operation DELETE /images/{id} deleteImage
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Deleted
	h.apiMux.DELETE("/api/v1/images/:imageID", h.requireAuthentication(h.deleteImage))
	// swagger:operation PUT /notes/{id}/image postNote
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: note
	//   in: body
	//   required: true
	//   schema:
	//     "$ref": "#/definitions/note"
	// responses:
	//   201:
	//     description: Created
	//     headers:
	//       Location:
	//         description: The url of the newly created resource
	//         type: string
	h.apiMux.POST("/api/v1/notes", h.requireAuthentication(h.postNote))
	// swagger:operation PUT /notes/{id}/image putNote
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: note
	//   in: body
	//   required: true
	//   schema:
	//     "$ref": "#/definitions/note"
	// responses:
	//   204:
	//     description: Modified
	h.apiMux.PUT("/api/v1/notes/:noteID", h.requireAuthentication(h.putNote))
	// swagger:operation DELETE /notes/{id} deleteNote
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Deleted
	h.apiMux.DELETE("/api/v1/notes/:noteID", h.requireAuthentication(h.deleteNote))
	// swagger:operation GET /tags getTags
	//
	// ---
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       type: array
	//       items:
	//         type: string
	h.apiMux.GET("/api/v1/tags", h.requireAuthentication(h.getTags))
	// swagger:operation GET /users/{id} getUser
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       "$ref": "#/definitions/user"
	h.apiMux.GET("/api/v1/users/:userID", h.requireAuthentication(h.getUser))
	// swagger:operation PUT /users/{id}/password putUserPassword
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: note
	//   in: body
	//   required: true
	//   schema:
	//     "$ref": "#/definitions/putUserPasswordRequest"
	// responses:
	//   204:
	//     description: Modified
	h.apiMux.PUT("/api/v1/users/:userID/password", h.requireAuthentication(h.putUserPassword))
	// swagger:operation GET /users/{id}/settings getUserSettings
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// responses:
	//   200:
	//     description: Success
	//     schema:
	//       "$ref": "#/definitions/userSettings"
	h.apiMux.GET("/api/v1/users/:userID/settings", h.requireAuthentication(h.getUserSettings))
	// swagger:operation PUT /users/{id}/settings putUserSettings
	//
	// ---
	// parameters:
	// - name: id
	//   in: path
	//   required: true
	//   type: integer
	// - name: note
	//   in: body
	//   required: true
	//   schema:
	//     "$ref": "#/definitions/userSettings"
	// responses:
	//   204:
	//     description: Modified
	h.apiMux.PUT("/api/v1/users/:userID/settings", h.requireAuthentication(h.putUserSettings))
	// swagger:operation POST /uploads postUpload
	//
	// ---
	// consumes:
	// - multipart/form-data
	// parameters:
	// - name: file
	//   in: formData
	//   required: true
	//   type: file
	// responses:
	//   201:
	//     description: Created
	//     headers:
	//       Location:
	//         description: The url of the newly created resource
	//         type: string
	h.apiMux.POST("/api/v1/uploads", h.requireAuthentication(h.postUpload))
	h.apiMux.NotFound = http.HandlerFunc(h.notFound)

	return &h
}

func (h apiHandler) notFound(resp http.ResponseWriter, req *http.Request) {
	h.JSON(resp, http.StatusNotFound, fmt.Sprintf("%s is not a valid API endpoint", req.URL.Path))
}

func (h apiHandler) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	resp.Header().Set("Content-Type", "application/json")
	h.apiMux.ServeHTTP(resp, req)
}

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
