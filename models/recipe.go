package models

import (
	"database/sql"
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
	Tags []string
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
	err = db.QueryRow("SELECT name, description, directions FROM recipe WHERE id = $1", id).Scan(&name, &description, &directions)
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

	r := &Recipe{
		Tags: tags,
	}
	r.ID = id
	r.Name = name
	r.Description = description
	r.Directions = directions
	return r, nil
}

func ListRecipes() ([]*RecipeCompact, error) {
	db, err := OpenDatabase()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	var recipes []*RecipeCompact
	rows, err := db.Query("SELECT id, name, description, directions FROM recipe")
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

func CreateRecipe(name string, description string, directions string, tags []string) (int64, error) {
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
	tx.Commit()

	return id, nil
}

func UpdateRecipe(r *Recipe) error {
	db, err := OpenDatabase()
	if err != nil {
		return err
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	_, err = db.Exec("UPDATE recipe SET name = $1, description = $2, directions = $3 WHERE id = $4", r.Name, r.Description, r.Directions, r.ID)

	_, err = db.Exec("DELETE FROM recipe_tags WHERE recipe_id = $1", r.ID)
	if err != nil {
		return err
	}
	for _, tag := range r.Tags {
		err = addTagToRecipe(db, r.ID, tag)
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
