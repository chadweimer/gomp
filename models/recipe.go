package models

import (
	"database/sql"
	"strings"
)

// Recipe is the primary model class for recipe storage and retrieval
type Recipe struct {
	ID          int64
	Name        string
	Description string
	Directions  string
	Tags        []string
	Ingredients Ingredients
}

// Recipes represents a list of Recipe objects
type Recipes []Recipe

func (recipe *Recipe) Create(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	result, err := tx.Exec(
		"INSERT INTO recipe (name, description, directions) VALUES ($1, $2, $3)",
		recipe.Name, recipe.Description, recipe.Directions)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	for _, tag := range recipe.Tags {
		_, err = tx.Exec(
			"INSERT INTO recipe_tags (recipe_id, tag) VALUES ($1, $2)",
			id, strings.ToLower(tag))
		if err != nil {
			return err
		}
	}

	for _, ingredient := range recipe.Ingredients {
		ingredient.RecipeID = id
		ingredient.Create(tx)
	}

	tx.Commit()

	recipe.ID = id
	return nil
}

func (recipe *Recipe) Read(db *sql.DB) error {
	result := db.QueryRow(
		"SELECT name, description, directions FROM recipe WHERE id = $1",
		recipe.ID)
	err := result.Scan(&recipe.Name, &recipe.Description, &recipe.Directions)
	if err != nil {
		return err
	}

	var tags []string
	rows, err := db.Query(
		"SELECT tag FROM recipe_tags WHERE recipe_id = $1",
		recipe.ID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var tag string
		err = rows.Scan(&tag)
		if err != nil {
			return err
		}
		tags = append(tags, tag)
	}

	recipe.Tags = tags
	return recipe.Ingredients.List(db, recipe.ID)
}

func (recipe *Recipe) Update(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	_, err = tx.Exec(
		"UPDATE recipe SET name = $1, description = $2, directions = $3 WHERE id = $4",
		recipe.Name, recipe.Description, recipe.Directions, recipe.ID)

	// TODO: Deleting and recreating seems inefficent and potentially error prone
	_, err = tx.Exec("DELETE FROM recipe_tags WHERE recipe_id = $1", recipe.ID)
	if err != nil {
		return err
	}
	for _, tag := range recipe.Tags {
		_, err = tx.Exec(
			"INSERT INTO recipe_tags (recipe_id, tag) VALUES ($1, $2)",
			recipe.ID, strings.ToLower(tag))
		if err != nil {
			return err
		}
	}

	// TODO: Deleting and recreating seems inefficent and potentially error prone
	err = recipe.Ingredients.DeleteAll(tx, recipe.ID)
	if err != nil {
		return err
	}
	for _, ingredient := range recipe.Ingredients {
		ingredient.Create(tx)
	}

	tx.Commit()
	return nil
}

func (recipe *Recipe) Delete(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}

	_, err = tx.Exec("DELETE FROM recipe WHERE id = $1", recipe.ID)
	if err != nil {
		return err
	}

	_, err = tx.Exec("DELETE FROM recipe_tags WHERE recipe_id = $1", recipe.ID)
	if err != nil {
		return err
	}

	ingredients := new(Ingredients)
	err = ingredients.DeleteAll(tx, recipe.ID)
	if err != nil {
		return err
	}

	tx.Commit()
	return nil
}

func (recipes *Recipes) List(db *sql.DB) error {
	rows, err := db.Query("SELECT id, name, description, directions FROM recipe ORDER BY name")
	if err != nil {
		return err
	}
	for rows.Next() {
		var recipe Recipe
		err = rows.Scan(&recipe.ID, &recipe.Name, &recipe.Description, &recipe.Directions)
		if err != nil {
			return err
		}
		*recipes = append(*recipes, recipe)
	}

	return nil
}
