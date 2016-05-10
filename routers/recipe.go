package routers

import (
	"database/sql"
	"fmt"
	"gomp/models"
	"io/ioutil"
	"math"
	"mime/multipart"
	"net/http"
	"strconv"

	"gopkg.in/macaron.v1"
)

// RecipeForm encapsulates user input on the Create and Edit recipe screens
type RecipeForm struct {
	Name             string `binding:"Required"`
	Description      string
    Ingredients      string
	Directions       string
	Tags             []string
}

// NoteForm encapsulates user input for a note on a recipe
type NoteForm struct {
	Note string
}

// AttachmentForm encapsulates user input for attaching a file (image) to a recipe
type AttachmentForm struct {
	FileName    string                `form:"file_name"`
	FileContent *multipart.FileHeader `form:"file_content"`
}

// GetRecipe handles retrieving and rendering a single recipe
func GetRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	db, err := models.OpenDatabase()
	if RedirectIfHasError(ctx, err) {
		return
	}
	defer db.Close()

	recipe := &models.Recipe{
		ID: id,
	}
	err = recipe.Read(db)
	if RedirectIfHasError(ctx, err) {
		return
	}
	if recipe == nil {
		NotFound(ctx)
		return
	}

	var notes = new(models.Notes)
	err = notes.List(db, id)
	if RedirectIfHasError(ctx, err) {
		return
	}

	var imgs = new(models.RecipeImages)
	err = imgs.List(id)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Data["Recipe"] = recipe
	ctx.Data["Notes"] = notes
	ctx.Data["Images"] = imgs
	ctx.HTML(http.StatusOK, "recipe/view")
}

// ListRecipes handles retrieving and rending a list of available recipes
func ListRecipes(ctx *macaron.Context) {
	query := ctx.Query("q")
	page := ctx.QueryInt("page")
	if page < 1 {
		page = 1
	}
	count := ctx.QueryInt("count")
	if count < 1 {
		count = 15
	}

	db, err := models.OpenDatabase()
	if RedirectIfHasError(ctx, err) {
		return
	}
	defer db.Close()

	recipes := new(models.Recipes)
	var total int
	if query == "" {
		total, err = recipes.List(db, page, count)
	} else {
		total, err = recipes.Find(db, query, page, count)
	}
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Data["Query"] = query
	ctx.Data["PageNum"] = page
	ctx.Data["PerPage"] = count
	ctx.Data["NumPages"] = int(math.Ceil(float64(total) / float64(count)))
	
	ctx.Data["Recipes"] = recipes
	ctx.Data["SearchQuery"] = query
	ctx.Data["ResultCount"] = total
	ctx.HTML(http.StatusOK, "recipe/list")
}

// CreateRecipe handles rendering the create recipe screen
func CreateRecipe(ctx *macaron.Context) {
	ctx.HTML(http.StatusOK, "recipe/create")
}

// CreateRecipePost handles processing the supplied
// form input from the create recipe screen
func CreateRecipePost(ctx *macaron.Context, form RecipeForm) {
	db, err := models.OpenDatabase()
	if RedirectIfHasError(ctx, err) {
		return
	}
	defer db.Close()

	tags := make(models.Tags, len(form.Tags))
	for _, tag := range form.Tags {
		tags = append(tags, models.Tag(tag))
	}
	recipe := &models.Recipe{
		Name:        form.Name,
		Description: form.Description,
        Ingredients: form.Ingredients,
		Directions:  form.Directions,
		Tags:        tags,
	}

	err = recipe.Create(db)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("/recipes/%d", recipe.ID))
}

// EditRecipe handles rendering the edit recipe screen
func EditRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	db, err := models.OpenDatabase()
	if RedirectIfHasError(ctx, err) {
		return
	}
	defer db.Close()

	recipe := &models.Recipe{ID: id}
	err = recipe.Read(db)
	if err == sql.ErrNoRows {
		NotFound(ctx)
		return
	}
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Data["Recipe"] = recipe
	ctx.HTML(http.StatusOK, "recipe/edit")
}

// EditRecipePost handles processing the supplied
// form input from the edit recipe screen
func EditRecipePost(ctx *macaron.Context, form RecipeForm) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	db, err := models.OpenDatabase()
	if RedirectIfHasError(ctx, err) {
		return
	}
	defer db.Close()

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

	err = recipe.Update(db)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}

// DeleteRecipe handles deleting the recipe with the given id
func DeleteRecipe(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	db, err := models.OpenDatabase()
	if RedirectIfHasError(ctx, err) {
		return
	}
	defer db.Close()

	recipe := &models.Recipe{ID: id}
	err = recipe.Delete(db)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Redirect("/recipes")
}

func AttachToRecipePost(ctx *macaron.Context, form AttachmentForm) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	uploadedFile, err := form.FileContent.Open()
	if RedirectIfHasError(ctx, err) {
		return
	}
	defer uploadedFile.Close()

	uploadedFileData, err := ioutil.ReadAll(uploadedFile)
	if RedirectIfHasError(ctx, err) {
		return
	}

	img := &models.RecipeImage{RecipeID: id}
	err = img.Create(form.FileName, uploadedFileData)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}

func AddNoteToRecipePost(ctx *macaron.Context, form NoteForm) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	db, err := models.OpenDatabase()
	if RedirectIfHasError(ctx, err) {
		return
	}

	note := models.Note{
		RecipeID: id,
		Note:     form.Note,
	}
	err = note.Create(db)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}
