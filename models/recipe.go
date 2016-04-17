package models

import "database/sql"

// Recipe is the primary model class for recipe storage and retrieval
type Recipe struct {
	ID   int
	Name string
}

func GetRecipeByID(id int) (*Recipe, error) {
	db := OpenDatabase()
	defer db.Close()

	var name string
	err := db.QueryRow("SELECT name FROM recipes WHERE id = $1", id).Scan(&name)
	switch {
		case err == sql.ErrNoRows:
			return nil, nil
		case err != nil:
			return nil, err
		default:
			return &Recipe{ID: id, Name: name}, nil
	}
}

func ListRecipes() ([]*Recipe, error) {
	db := OpenDatabase()
	defer db.Close()

	var recipes []*Recipe
	rows, err := db.Query("SELECT id, name FROM recipes")
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id int
		var name string
		rows.Scan(&id, &name)
		recipes = append(recipes, &Recipe{ID: id, Name: name})
	}

	return recipes, nil
}
