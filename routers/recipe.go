package routers

import (
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/modules/context"
	"github.com/julienschmidt/httprouter"
	"github.com/mholt/binding"
)

// RecipeForm encapsulates user input on the Create and Edit recipe screens
type RecipeForm struct {
	Name          string   `form:"name"`
	ServingSize   string   `form:"serving-size"`
	NutritionInfo string   `form:"nutrition-info"`
	Ingredients   string   `form:"ingredients"`
	Directions    string   `form:"directions"`
	Tags          []string `form:"tags"`
}

// FieldMap provides the RecipeForm field name maping for form binding
func (f *RecipeForm) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&f.Name:          "name",
		&f.ServingSize:   "serving-size",
		&f.NutritionInfo: "nutrition-info",
		&f.Ingredients:   "ingredients",
		&f.Directions:    "directions",
		&f.Tags:          "tags",
	}
}

// NoteForm encapsulates user input for a note on a recipe
type NoteForm struct {
	Note string `form:"note"`
}

// FieldMap provides the NoteForm field name maping for form binding
func (f *NoteForm) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&f.Note: "note",
	}
}

// AttachmentForm encapsulates user input for attaching a file (image) to a recipe
type AttachmentForm struct {
	FileName    string                `form:"file_name"`
	FileContent *multipart.FileHeader `form:"file_content"`
}

// FieldMap provides the AttachmentForm field name maping for form binding
func (f *AttachmentForm) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&f.FileName:    "file_name",
		&f.FileContent: "file_content",
	}
}

// RatingForm encapsulates user input for rating a recipe (1-5)
type RatingForm struct {
	Rating float64 `form:"rating"`
}

// FieldMap provides the RatingForm field name maping for form binding
func (f *RatingForm) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&f.Rating: "rating",
	}
}

// GetRecipe handles retrieving and rendering a single recipe
func (rc *RouteController) GetRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	recipe, err := rc.model.Recipes.Read(id)
	if err == models.ErrNotFound {
		rc.NotFound(resp, req)
		return
	}
	if rc.HasError(resp, req, err) {
		return
	}

	notes, err := rc.model.Notes.List(id)
	if rc.HasError(resp, req, err) {
		return
	}

	imgs, err := rc.model.Images.List(id)
	if rc.HasError(resp, req, err) {
		return
	}

	data := context.Get(req).Data
	data["Recipe"] = recipe
	data["Notes"] = notes
	data["Images"] = imgs
	rc.HTML(resp, http.StatusOK, "recipe/view", data)
}

// ListRecipes handles retrieving and rending a list of available recipes
func (rc *RouteController) ListRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	sess, err := rc.sessionStore.Get(req, "UserSession")
	if err != nil {
		log.Print("Invalid session retrieved.")
		http.Redirect(resp, req, fmt.Sprintf("%s/logout", rc.cfg.RootURLPath), http.StatusFound)
		return
	}

	clear := req.URL.Query().Get("clear")
	if clear != "" {
		delete(sess.Values, "q")
		delete(sess.Values, "tags")
	}

	query := req.URL.Query().Get("q")
	if query == "" {
		if sessQuery := sess.Values["q"]; sessQuery != nil {
			query = sessQuery.(string)
		}
	}

	var tags []string
	tagStr := req.URL.Query().Get("tags")
	if tagStr != "" {
		tags = strings.Split(tagStr, ",")
	} else {
		if sessTags := sess.Values["tags"]; sessTags != nil {
			tags = sessTags.([]string)
		}
	}

	var page int64
	if pageStr := req.URL.Query().Get("page"); pageStr != "" {
		page, _ = strconv.ParseInt(pageStr, 10, 64)
	}
	if page < 1 {
		page = 1
	}

	viewType := req.URL.Query().Get("view")
	if viewType == "" {
		viewType = "full"
		if sessViewType := sess.Values["view"]; sessViewType != nil {
			viewType = sessViewType.(string)
		}
	}

	var count int64
	if viewType == "compact" {
		count = 60
	} else {
		count = 12
	}

	var recipes *models.Recipes
	var total int64
	recipes, total, err = rc.model.Search.Find(models.SearchFilter{Query: query, Tags: tags}, page, count)
	if rc.HasError(resp, req, err) {
		return
	}

	sess.Values["q"] = query
	sess.Values["tags"] = tags
	sess.Values["view"] = viewType
	sess.Save(req, resp)

	data := context.Get(req).Data
	data["PageNum"] = page
	data["PerPage"] = count
	data["NumPages"] = int64(math.Ceil(float64(total) / float64(count)))
	data["Recipes"] = recipes
	data["SearchQuery"] = query
	data["SearchTags"] = strings.Join(tags, ",")
	data["ResultCount"] = total
	data["ViewType"] = viewType
	rc.HTML(resp, http.StatusOK, "recipe/list", data)
}

// CreateRecipe handles rendering the create recipe screen
func (rc *RouteController) CreateRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "recipe/edit", context.Get(req).Data)
}

// CreateRecipePost handles processing the supplied form input from the create recipe screen
func (rc *RouteController) CreateRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(RecipeForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HasError(resp, req, errors.New(errs.Error()))
		return
	}

	recipe := &models.Recipe{
		Name:          form.Name,
		ServingSize:   form.ServingSize,
		NutritionInfo: form.NutritionInfo,
		Ingredients:   form.Ingredients,
		Directions:    form.Directions,
		Tags:          form.Tags,
	}

	err := rc.model.Recipes.Create(recipe)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, recipe.ID), http.StatusFound)
}

// EditRecipe handles rendering the edit recipe screen
func (rc *RouteController) EditRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	recipe, err := rc.model.Recipes.Read(id)
	if err == models.ErrNotFound {
		rc.NotFound(resp, req)
		return
	}
	if rc.HasError(resp, req, err) {
		return
	}

	data := context.Get(req).Data
	data["Recipe"] = recipe
	rc.HTML(resp, http.StatusOK, "recipe/edit", data)
}

// EditRecipePost handles processing the supplied form input from the edit recipe screen
func (rc *RouteController) EditRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(RecipeForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HasError(resp, req, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	recipe := &models.Recipe{
		ID:            id,
		Name:          form.Name,
		ServingSize:   form.ServingSize,
		NutritionInfo: form.NutritionInfo,
		Ingredients:   form.Ingredients,
		Directions:    form.Directions,
		Tags:          form.Tags,
	}

	err = rc.model.Recipes.Update(recipe)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}

// DeleteRecipe handles deleting the recipe with the given id
func (rc *RouteController) DeleteRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	err = rc.model.Recipes.Delete(id)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes", rc.cfg.RootURLPath), http.StatusFound)
}

// CreateAttachmentPost handles uploading the specified attachment (image) to a recipe
func (rc *RouteController) CreateAttachmentPost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(AttachmentForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HasError(resp, req, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	uploadedFile, err := form.FileContent.Open()
	if rc.HasError(resp, req, err) {
		return
	}
	defer uploadedFile.Close()

	uploadedFileData, err := ioutil.ReadAll(uploadedFile)
	if rc.HasError(resp, req, err) {
		return
	}

	imageInfo := &models.RecipeImage{
		RecipeID: id,
		Name:     form.FileName,
	}
	err = rc.model.Images.Create(imageInfo, uploadedFileData)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}

// DeleteAttachment handles deleting the specified attachment (image) from a recipe
func (rc *RouteController) DeleteAttachment(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	imageID, err := strconv.ParseInt(p.ByName("image_id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	recipeID, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	err = rc.model.Images.Delete(imageID)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, recipeID), http.StatusFound)
}

// CreateNotePost handles processing the supplied form input for adding a note to a recipe
func (rc *RouteController) CreateNotePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(NoteForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HasError(resp, req, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	note := &models.Note{
		RecipeID: id,
		Note:     form.Note,
	}
	err = rc.model.Notes.Create(note)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}

// EditNotePost handles processing the supplied form input for adding a note to a recipe
func (rc *RouteController) EditNotePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(NoteForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HasError(resp, req, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	noteID, err := strconv.ParseInt(p.ByName("note_id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	note := &models.Note{
		ID:       noteID,
		RecipeID: id,
		Note:     form.Note,
	}
	err = rc.model.Notes.Update(note)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}

// DeleteNote handles deleting the note with the given id
func (rc *RouteController) DeleteNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	noteID, err := strconv.ParseInt(p.ByName("note_id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	err = rc.model.Notes.Delete(noteID)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}

// RateRecipePost handles adding/updating the rating of a recipe
func (rc *RouteController) RateRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(RatingForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.HasError(resp, req, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.HasError(resp, req, err) {
		return
	}

	err = rc.model.Recipes.SetRating(id, form.Rating)
	if rc.HasError(resp, req, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}
