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
func GetRecipe(ctx *macaron.Context, r *render.Render) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	recipe := &models.Recipe{
		ID: id,
	}
	err = recipe.Read()
	if err == models.ErrNotFound {
		NotFound(ctx, r)
		return
	}
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	var notes = new(models.Notes)
	err = notes.List(id)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	var imgs = new(models.RecipeImages)
	err = imgs.List(id)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	ctx.Data["Recipe"] = recipe
	ctx.Data["Notes"] = notes
	ctx.Data["Images"] = imgs
	r.HTML(ctx.Resp, http.StatusOK, "recipe/view", ctx.Data)
}

// ListRecipes handles retrieving and rending a list of available recipes
func ListRecipes(ctx *macaron.Context, r *render.Render) {
	query := ctx.Query("q")
	page := ctx.QueryInt("page")
	if page < 1 {
		page = 1
	}
	count := ctx.QueryInt("count")
	if count < 1 {
		count = 15
	}

	recipes := new(models.Recipes)
	var total int
	var err error
	if query == "" {
		total, err = recipes.List(page, count)
	} else {
		total, err = recipes.Find(query, page, count)
	}
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	ctx.Data["Query"] = query
	ctx.Data["PageNum"] = page
	ctx.Data["PerPage"] = count
	ctx.Data["NumPages"] = int(math.Ceil(float64(total) / float64(count)))

	ctx.Data["Recipes"] = recipes
	ctx.Data["SearchQuery"] = query
	ctx.Data["ResultCount"] = total
	r.HTML(ctx.Resp, http.StatusOK, "recipe/list", ctx.Data)
}

// CreateRecipe handles rendering the create recipe screen
func CreateRecipe(ctx *macaron.Context, r *render.Render) {
	r.HTML(ctx.Resp, http.StatusOK, "recipe/create", ctx.Data)
}

// CreateRecipePost handles processing the supplied
// form input from the create recipe screen
func CreateRecipePost(ctx *macaron.Context, r *render.Render) {
	form := new(RecipeForm)
	errs := binding.Bind(ctx.Req.Request, form)
	if errs != nil && errs.Len() > 0 {
		RedirectIfHasError(ctx, r, errors.New(errs.Error()))
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
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("%s/recipes/%d", conf.RootURLPath(), recipe.ID))
}

// EditRecipe handles rendering the edit recipe screen
func EditRecipe(ctx *macaron.Context, r *render.Render) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	recipe := &models.Recipe{ID: id}
	err = recipe.Read()
	if err == models.ErrNotFound {
		NotFound(ctx, r)
		return
	}
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	ctx.Data["Recipe"] = recipe
	r.HTML(ctx.Resp, http.StatusOK, "recipe/edit", ctx.Data)
}

// EditRecipePost handles processing the supplied
// form input from the edit recipe screen
func EditRecipePost(ctx *macaron.Context, r *render.Render) {
	form := new(RecipeForm)
	errs := binding.Bind(ctx.Req.Request, form)
	if errs != nil && errs.Len() > 0 {
		RedirectIfHasError(ctx, r, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, r, err) {
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
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("%s/recipes/%d", conf.RootURLPath(), id))
}

// DeleteRecipe handles deleting the recipe with the given id
func DeleteRecipe(ctx *macaron.Context, r *render.Render) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	recipe := &models.Recipe{ID: id}
	err = recipe.Delete()
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("%s/recipes", conf.RootURLPath()))
}

func AttachToRecipePost(ctx *macaron.Context, r *render.Render) {
	form := new(AttachmentForm)
	errs := binding.Bind(ctx.Req.Request, form)
	if errs != nil && errs.Len() > 0 {
		RedirectIfHasError(ctx, r, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	uploadedFile, err := form.FileContent.Open()
	if RedirectIfHasError(ctx, r, err) {
		return
	}
	defer uploadedFile.Close()

	uploadedFileData, err := ioutil.ReadAll(uploadedFile)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	img := &models.RecipeImage{RecipeID: id}
	err = img.Create(form.FileName, uploadedFileData)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("%s/recipes/%d", conf.RootURLPath(), id))
}

func AddNoteToRecipePost(ctx *macaron.Context, r *render.Render) {
	form := new(NoteForm)
	errs := binding.Bind(ctx.Req.Request, form)
	if errs != nil && errs.Len() > 0 {
		RedirectIfHasError(ctx, r, errors.New(errs.Error()))
		return
	}

	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	note := models.Note{
		RecipeID: id,
		Note:     form.Note,
	}
	err = note.Create()
	if RedirectIfHasError(ctx, r, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("%s/recipes/%d", conf.RootURLPath(), id))
}
