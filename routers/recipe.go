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
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/mholt/binding"
	"github.com/unrolled/render"
	"gopkg.in/macaron.v1"
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
func GetRecipe(resp http.ResponseWriter, req *http.Request, ctx *macaron.Context, r *render.Render) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	recipe := &models.Recipe{
		ID: id,
	}
	err = recipe.Read()
	if err == models.ErrNotFound {
		NotFound(resp, r)
		return
	}
	if RedirectIfHasError(resp, r, err) {
		return
	}

	var notes = new(models.Notes)
	err = notes.List(id)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	var imgs = new(models.RecipeImages)
	err = imgs.List(id)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	data := map[string]interface{}{
		"Recipe": recipe,
		"Notes":  notes,
		"Images": imgs,
	}
	r.HTML(resp, http.StatusOK, "recipe/view", data)
}

// ListRecipes handles retrieving and rending a list of available recipes
func ListRecipes(resp http.ResponseWriter, req *http.Request, r *render.Render) {
	query := req.URL.Query().Get("q")
	page, _ := strconv.ParseInt(req.URL.Query().Get("page"), 10, 64)
	if page < 1 {
		page = 1
	}
	count, _ := strconv.ParseInt(req.URL.Query().Get("count"), 10, 64)
	if count < 1 {
		count = 15
	}

	recipes := new(models.Recipes)
	var total int64
	var err error
	if query == "" {
		total, err = recipes.List(page, count)
	} else {
		total, err = recipes.Find(query, page, count)
	}
	if RedirectIfHasError(resp, r, err) {
		return
	}

	data := map[string]interface{}{
		"Query":    query,
		"PageNum":  page,
		"PerPage":  count,
		"NumPages": int64(math.Ceil(float64(total) / float64(count))),

		"Recipes":     recipes,
		"SearchQuery": query,
		"ResultCount": total,
	}
	r.HTML(resp, http.StatusOK, "recipe/list", data)
}

// CreateRecipe handles rendering the create recipe screen
func CreateRecipe(resp http.ResponseWriter, req *http.Request, r *render.Render) {
	r.HTML(resp, http.StatusOK, "recipe/create", make(map[string]interface{}))
}

// CreateRecipePost handles processing the supplied
// form input from the create recipe screen
func CreateRecipePost(resp http.ResponseWriter, req *http.Request, r *render.Render) {
	form := new(RecipeForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		RedirectIfHasError(resp, r, errors.New(errs.Error()))
		return
	}

	tags := make(models.Tags, len(form.Tags))
	for i, tag := range form.Tags {
		tags[i] = models.Tag(tag)
	}
	recipe := &models.Recipe{
		Name:        form.Name,
		Description: form.Description,
		Ingredients: form.Ingredients,
		Directions:  form.Directions,
		Tags:        tags,
	}

	err := recipe.Create()
	if RedirectIfHasError(resp, r, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", conf.RootURLPath(), recipe.ID), http.StatusFound)
}

// EditRecipe handles rendering the edit recipe screen
func EditRecipe(resp http.ResponseWriter, req *http.Request, ctx *macaron.Context, r *render.Render) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	recipe := &models.Recipe{ID: id}
	err = recipe.Read()
	if err == models.ErrNotFound {
		NotFound(resp, r)
		return
	}
	if RedirectIfHasError(resp, r, err) {
		return
	}

	data := map[string]interface{}{
		"Recipe": recipe,
	}
	r.HTML(resp, http.StatusOK, "recipe/edit", data)
}

// EditRecipePost handles processing the supplied
// form input from the edit recipe screen
func EditRecipePost(resp http.ResponseWriter, req *http.Request, ctx *macaron.Context, r *render.Render) {
	form := new(RecipeForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		RedirectIfHasError(resp, r, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	tags := make(models.Tags, len(form.Tags))
	for i, tag := range form.Tags {
		tags[i] = models.Tag(tag)
	}
	recipe := &models.Recipe{
		ID:          id,
		Name:        form.Name,
		Description: form.Description,
		Ingredients: form.Ingredients,
		Directions:  form.Directions,
		Tags:        tags,
	}

	err = recipe.Update()
	if RedirectIfHasError(resp, r, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", conf.RootURLPath(), id), http.StatusFound)
}

// DeleteRecipe handles deleting the recipe with the given id
func DeleteRecipe(resp http.ResponseWriter, req *http.Request, ctx *macaron.Context, r *render.Render) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	recipe := &models.Recipe{ID: id}
	err = recipe.Delete()
	if RedirectIfHasError(resp, r, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes", conf.RootURLPath()), http.StatusFound)
}

func AttachToRecipePost(resp http.ResponseWriter, req *http.Request, ctx *macaron.Context, r *render.Render) {
	form := new(AttachmentForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		RedirectIfHasError(resp, r, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	uploadedFile, err := form.FileContent.Open()
	if RedirectIfHasError(resp, r, err) {
		return
	}
	defer uploadedFile.Close()

	uploadedFileData, err := ioutil.ReadAll(uploadedFile)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	img := &models.RecipeImage{RecipeID: id}
	err = img.Create(form.FileName, uploadedFileData)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", conf.RootURLPath(), id), http.StatusFound)
}

func AddNoteToRecipePost(resp http.ResponseWriter, req *http.Request, ctx *macaron.Context, r *render.Render) {
	form := new(NoteForm)
	errs := binding.Bind(req, form)
	if errs != nil && errs.Len() > 0 {
		RedirectIfHasError(resp, r, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(resp, r, err) {
		return
	}

	note := models.Note{
		RecipeID: id,
		Note:     form.Note,
	}
	err = note.Create()
	if RedirectIfHasError(resp, r, err) {
		return
	}

	http.Redirect(resp, req, fmt.Sprintf("%s/recipes/%d", conf.RootURLPath(), id), http.StatusFound)
}
