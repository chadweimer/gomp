package models

import (
	"database/sql"
	"math/big"
	"strings"
)

// RecipeCompact is the model class for recipe retrieval when displaying
// summary information (e.g., a list of recipes)
type RecipeCompact struct {
	ID          int64
	Name        string
	Description string
	Directions  string
}

// Recipe is the primary model class for recipe storage and retrieval
type Recipe struct {
	Tags        []string
	Ingredients []*Ingredient
	RecipeCompact
}

func GetRecipeByID(id int64) (*Recipe, error) {
	db, err := OpenDatabase()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	var name string
	var description string
	var directions string
	result := db.QueryRow("SELECT name, description, directions FROM recipe WHERE id = $1", id)
	err = result.Scan(&name, &description, &directions)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var tags []string
	rows, err := db.Query("SELECT tag FROM recipe_tags WHERE recipe_id = $1", id)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var tag string
		rows.Scan(&tag)
		tags = append(tags, tag)
	}

	recipe := &Recipe{
		Tags: tags,
	}
	recipe.ID = id
	recipe.Name = name
	recipe.Description = description
	recipe.Directions = directions

	ingredients, err := GetIngredientsByRecipeID(id)
	if err != nil {
		return nil, err
	}
	recipe.Ingredients = ingredients
	return recipe, nil
}

func ListRecipes() ([]*RecipeCompact, error) {
	db, err := OpenDatabase()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	var recipes []*RecipeCompact
	rows, err := db.Query("SELECT id, name, description, directions FROM recipe ORDER BY name")
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id int64
		var name string
		var description string
		var directions string
		rows.Scan(&id, &name, &description, &directions)
		recipes = append(recipes, &RecipeCompact{ID: id, Name: name, Description: description, Directions: directions})
	}

	return recipes, nil
}

func CreateRecipe(
	name string,
	description string,
	directions string,
	tags []string,
	ingredientAmounts []string,
	ingredientUnitIDs []int64,
	ingredientNames []string) (int64, error) {
	db, err := OpenDatabase()
	if err != nil {
		return -1, err
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		return -1, err
	}
	result, err := db.Exec("INSERT INTO recipe (name, description, directions) VALUES ($1, $2, $3)", name, description, directions)
	if err != nil {
		return -1, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return -1, err
	}

	for _, tag := range tags {
		err = addTagToRecipe(db, id, tag)
		if err != nil {
			return -1, err
		}
	}

	// TODO: Checks that all the lengths match
	for i := 0; i < len(ingredientAmounts); i++ {
		// Convert amount string into a floating point number
		amountRat := new(big.Rat)
		amountRat.SetString(ingredientAmounts[i])
		amount, _ := amountRat.Float64()

		_, err = db.Exec(
			"INSERT INTO recipe_ingredient (recipe_id, amount, amount_display, name, unit_id) VALUES ($1, $2, $3, $4, $5)",
			id, amount, ingredientAmounts[i], ingredientNames[i], ingredientUnitIDs[i])
		if err != nil {
			return -1, err
		}
	}

	tx.Commit()

	return id, nil
}

func UpdateRecipe(
	id int64,
	name string,
	description string,
	directions string,
	tags []string,
	ingredientAmounts []string,
	ingredientUnitIDs []int64,
	ingredientNames []string) error {
	db, err := OpenDatabase()
	if err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	_, err = db.Exec(
		"UPDATE recipe SET name = $1, description = $2, directions = $3 WHERE id = $4",
		name, description, directions, id)

	// TODO: Deleting and recreating seems inefficent and potentially error prone
	_, err = db.Exec("DELETE FROM recipe_tags WHERE recipe_id = $1", id)
	if err != nil {
		return err
	}
	for _, tag := range tags {
		err = addTagToRecipe(db, id, tag)
		if err != nil {
			return err
		}
	}

	// TODO: Deleting and recreating seems inefficent and potentially error prone
	_, err = db.Exec("DELETE FROM recipe_ingredient WHERE recipe_id = $1", id)
	if err != nil {
		return err
	}
	for i := 0; i < len(ingredientAmounts); i++ {
		// Convert amount string into a floating point number
		amountRat := new(big.Rat)
		amountRat.SetString(ingredientAmounts[i])
		amount, _ := amountRat.Float64()

		_, err = db.Exec(
			"INSERT INTO recipe_ingredient (recipe_id, amount, amount_display, name, unit_id) VALUES ($1, $2, $3, $4, $5)",
			id, amount, ingredientAmounts[i], ingredientNames[i], ingredientUnitIDs[i])
		if err != nil {
			return err
		}
	}

	tx.Commit()

	return nil
}

func addTagToRecipe(db *sql.DB, recipeID int64, tag string) error {
	_, err := db.Exec("INSERT INTO recipe_tags (recipe_id, tag) VALUES ($1, $2)", recipeID, strings.ToLower(tag))
	return err
}

func DeleteRecipe(id int64) error {
	db, err := OpenDatabase()
	if err != nil {
		return err
	}
	defer db.Close()

	_, err = db.Exec("DELETE FROM recipe WHERE id = $1", id)
	return err
}
