package routers

import (
	"database/sql"
	"errors"
	"fmt"
	"gomp/models"
	"math/big"
	"net/http"
	"strconv"

	"gopkg.in/macaron.v1"
)

// RecipeForm encapsulates user input on the Create and Edit recipe screens
type RecipeForm struct {
	Name             string `binding:"Required"`
	Description      string
	Directions       string
	Tags             []string
	IngredientAmount []string `form:"ingredient_amount"`
	IngredientUnit   []int64  `form:"ingredient_unit"`
	IngredientName   []string `form:"ingredient_name"`
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

	ctx.Data["Recipe"] = recipe
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

	ctx.Data["Recipes"] = recipes
	ctx.Data["SearchQuery"] = query
	ctx.Data["ResultCount"] = total
	ctx.HTML(http.StatusOK, "recipe/list")
}

// CreateRecipe handles rendering the create recipe screen
func CreateRecipe(ctx *macaron.Context) {
	db, err := models.OpenDatabase()
	if RedirectIfHasError(ctx, err) {
		return
	}
	defer db.Close()

	units := new(models.Units)
	err = units.List(db)
	if RedirectIfHasError(ctx, err) {
		return
	}
	ctx.Data["Units"] = units
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
		Directions:  form.Directions,
		Tags:        tags,
	}

	// TODO: Checks that all the lengths match
	for i := 0; i < len(form.IngredientAmount); i++ {
		// Convert amount string into a floating point number
		amountRat := new(big.Rat)
		amountRat.SetString(form.IngredientAmount[i])
		amount, _ := amountRat.Float64()

		recipe.Ingredients = append(
			recipe.Ingredients,
			models.Ingredient{
				Name:          form.IngredientName[i],
				Amount:        amount,
				AmountDisplay: form.IngredientAmount[i],
				Unit:          models.Unit{ID: form.IngredientUnit[i]},
			})
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

	units := new(models.Units)
	err = units.List(db)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Data["Recipe"] = recipe
	ctx.Data["Units"] = units
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
	for _, tag := range form.Tags {
		tags = append(tags, models.Tag(tag))
	}
	recipe := &models.Recipe{
		ID:          id,
		Name:        form.Name,
		Description: form.Description,
		Directions:  form.Directions,
		Tags:        tags,
	}

	// TODO: Checks that all the lengths match
	for i := 0; i < len(form.IngredientAmount); i++ {
		// Convert amount string into a floating point number
		amountRat := new(big.Rat)
		amountRat, ok := amountRat.SetString(form.IngredientAmount[i])
		var amount float64
		if ok {
			amount, ok = amountRat.Float64()
		}
		if !ok {
			RedirectIfHasError(
				ctx,
				errors.New("Could not convert supplied ingredient amount"))
		}

		recipe.Ingredients = append(
			recipe.Ingredients,
			models.Ingredient{
				Name:          form.IngredientName[i],
				Amount:        amount,
				AmountDisplay: form.IngredientAmount[i],
				RecipeID:      recipe.ID,
				Unit:          models.Unit{ID: form.IngredientUnit[i]},
			})
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

func AttachToRecipePost(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}

func AddNoteToRecipePost(ctx *macaron.Context) {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if RedirectIfHasError(ctx, err) {
		return
	}

	ctx.Redirect(fmt.Sprintf("/recipes/%d", id))
}
