package routers

import (
	"errors"
	"fmt"
	"io/ioutil"
	"math"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/goincremental/negroni-sessions"
	"github.com/julienschmidt/httprouter"
	"github.com/mholt/binding"
)

// RecipeForm encapsulates user input on the Create and Edit recipe screens
type RecipeForm struct {
	Name        string   `form:"name"`
	Description string   `form:"description"`
	Ingredients string   `form:"ingredients"`
	Directions  string   `form:"directions"`
	Tags        []string `form:"tags"`
}

func (f *RecipeForm) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&f.Name:        "name",
		&f.Description: "description",
		&f.Ingredients: "ingredients",
		&f.Directions:  "directions",
		&f.Tags:        "tags",
	}
}

// NoteForm encapsulates user input for a note on a recipe
type NoteForm struct {
	Note string `form:"note"`
}

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

func (f *AttachmentForm) FieldMap(req *http.Request) binding.FieldMap {
	return binding.FieldMap{
		&f.FileName:    "file_name",
		&f.FileContent: "file_content",
	}
}

// GetRecipe handles retrieving and rendering a single recipe
func (rc *RouteController) GetRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	recipe, err := rc.model.Recipes.Read(id)
	if err == models.ErrNotFound {
		rc.NotFound(resp, req)
		return
	}
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	notes, err := rc.model.Notes.List(id)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	imgs, err := rc.model.Images.List(id)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	data := map[string]interface{}{
		"Recipe": recipe,
		"Notes":  notes,
		"Images": imgs,
	}
	rc.HTML(resp, http.StatusOK, "recipe/view", data)
}

// ListRecipes handles retrieving and rending a list of available recipes
func (rc *RouteController) ListRecipes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	sess := sessions.GetSession(req)

	query := req.URL.Query().Get("q")
	clear := req.URL.Query().Get("clear")
	if query != "" || clear != "" {
		sess.Delete("q")
		sess.Delete("page")
		sess.Delete("count")
	} else if query == "" {
		if sessQuery := sess.Get("q"); sessQuery != nil {
			query = sessQuery.(string)
		}
	}

	var page int64
	if pageStr := req.URL.Query().Get("page"); pageStr != "" {
		page, _ = strconv.ParseInt(pageStr, 10, 64)
	} else if sessPage := sess.Get("page"); sessPage != nil {
		page = sessPage.(int64)
	}
	if page < 1 {
		page = 1
	}

	var count int64
	if countStr := req.URL.Query().Get("count"); countStr != "" {
		count, _ = strconv.ParseInt(countStr, 10, 64)
	} else if sessCount := sess.Get("count"); sessCount != nil {
		count = sessCount.(int64)
	}
	if count < 1 {
		count = 15
	}

	var recipes *models.Recipes
	var total int64
	var err error
	if query == "" {
		recipes, total, err = rc.model.Recipes.List(page, count)
	} else {
		recipes, total, err = rc.model.Recipes.Find(query, page, count)
	}
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	sess.Set("q", query)
	sess.Set("page", page)
	sess.Set("count", count)

	data := map[string]interface{}{
		"Query":    query,
		"PageNum":  page,
		"PerPage":  count,
		"NumPages": int64(math.Ceil(float64(total) / float64(count))),

		"Recipes":     recipes,
		"SearchQuery": query,
		"ResultCount": total,
	}
	rc.HTML(resp, http.StatusOK, "recipe/list", data)
}

// CreateRecipe handles rendering the create recipe screen
func (rc *RouteController) CreateRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	rc.HTML(resp, http.StatusOK, "recipe/create", make(map[string]interface{}))
}

// CreateRecipePost handles processing the supplied
// form input from the create recipe screen
func (rc *RouteController) CreateRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(RecipeForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.RedirectIfHasError(resp, errors.New(errs.Error()))
		return
	}

	recipe := &models.Recipe{
		Name:        form.Name,
		Description: form.Description,
		Ingredients: form.Ingredients,
		Directions:  form.Directions,
		Tags:        form.Tags,
	}

	err := rc.model.Recipes.Create(recipe)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, recipe.ID), http.StatusFound)
}

// EditRecipe handles rendering the edit recipe screen
func (rc *RouteController) EditRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	recipe, err := rc.model.Recipes.Read(id)
	if err == models.ErrNotFound {
		rc.NotFound(resp, req)
		return
	}
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	data := map[string]interface{}{
		"Recipe": recipe,
	}
	rc.HTML(resp, http.StatusOK, "recipe/edit", data)
}

// EditRecipePost handles processing the supplied
// form input from the edit recipe screen
func (rc *RouteController) EditRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(RecipeForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.RedirectIfHasError(resp, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	recipe := &models.Recipe{
		ID:          id,
		Name:        form.Name,
		Description: form.Description,
		Ingredients: form.Ingredients,
		Directions:  form.Directions,
		Tags:        form.Tags,
	}

	err = rc.model.Recipes.Update(recipe)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}

// DeleteRecipe handles deleting the recipe with the given id
func (rc *RouteController) DeleteRecipe(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	err = rc.model.Recipes.Delete(id)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes", rc.cfg.RootURLPath), http.StatusFound)
}

func (rc *RouteController) AttachToRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(AttachmentForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.RedirectIfHasError(resp, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	uploadedFile, err := form.FileContent.Open()
	if rc.RedirectIfHasError(resp, err) {
		return
	}
	defer uploadedFile.Close()

	uploadedFileData, err := ioutil.ReadAll(uploadedFile)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	err = rc.model.Images.Save(id, form.FileName, uploadedFileData)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}

func (rc *RouteController) AddNoteToRecipePost(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	form := new(NoteForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		rc.RedirectIfHasError(resp, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(p.ByName("id"), 10, 64)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	note := &models.Note{
		RecipeID: id,
		Note:     form.Note,
	}
	err = rc.model.Notes.Create(note)
	if rc.RedirectIfHasError(resp, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", rc.cfg.RootURLPath, id), http.StatusFound)
}
