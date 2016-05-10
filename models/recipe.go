package models

import "database/sql"

// Recipe is the primary model class for recipe storage and retrieval
type Recipe struct {
	ID          int64
	Name        string
	Description string
    Ingredients string
	Directions  string
	Image       string
	Tags        Tags
}

// Recipes represents a list of Recipe objects
type Recipes []Recipe

func (recipe *Recipe) Create(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	result, err := tx.Exec(
		"INSERT INTO recipe (name, description, ingredients, directions) VALUES (?, ?, ?, ?)",
		recipe.Name, recipe.Description, recipe.Ingredients, recipe.Directions)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	for _, tag := range recipe.Tags {
		tag.Create(tx, id)
		if err != nil {
			return err
		}
	}

	tx.Commit()

	recipe.ID = id
	return nil
}

func (recipe *Recipe) Read(db *sql.DB) error {
	result := db.QueryRow(
		"SELECT name, description, ingredients, directions FROM recipe WHERE id = ?",
		recipe.ID)
	err := result.Scan(&recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions)
	if err != nil {
		return err
	}

	return recipe.Tags.List(db, recipe.ID)
}

func (recipe *Recipe) Update(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	_, err = tx.Exec(
		"UPDATE recipe SET name = ?, description = ?, ingredients = ?, directions = ? WHERE id = ?",
		recipe.Name, recipe.Description, recipe.Ingredients, recipe.Directions, recipe.ID)

	// TODO: Deleting and recreating seems inefficent and potentially error prone
	err = recipe.Tags.DeleteAll(tx, recipe.ID)
	if err != nil {
		return err
	}
	for _, tag := range recipe.Tags {
		err = tag.Create(tx, recipe.ID)
		if err != nil {
			return err
		}
	}

	tx.Commit()
	return nil
}

func (recipe *Recipe) Delete(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}

	_, err = tx.Exec("DELETE FROM recipe WHERE id = ?", recipe.ID)
	if err != nil {
		return err
	}

	err = recipe.Tags.DeleteAll(tx, recipe.ID)
	_, err = tx.Exec("DELETE FROM recipe_tags WHERE recipe_id = $1", recipe.ID)
	if err != nil {
		return err
	}

	tx.Commit()
	return nil
}

func (recipes *Recipes) List(db *sql.DB, page int, count int) (int, error) {
	var total int
	row := db.QueryRow("SELECT count(*) FROM recipe")
	err := row.Scan(&total)
	if err != nil {
		return 0, err
	}

	offset := count * (page - 1)
	rows, err := db.Query(
		"SELECT id, name, description, ingredients,  directions FROM recipe ORDER BY name LIMIT ? OFFSET ?",
		count, offset)
	if err != nil {
		return 0, err
	}
	for rows.Next() {
		var recipe Recipe
		err = rows.Scan(&recipe.ID, &recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions)
		if err != nil {
			return 0, err
		}

		var imgs = new(RecipeImages)
		err = imgs.List(recipe.ID)
		if err != nil {
			return 0, err
		}
		if len(*imgs) > 0 {
			recipe.Image = (*imgs)[0].ThumbnailURL
		}

		*recipes = append(*recipes, recipe)
	}

	return total, nil
}

func (recipes *Recipes) Find(db *sql.DB, search string, page int, count int) (int, error) {
	var total int
	search = "%" + search + "%"
	partialStmt := " FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_tags AS t ON t.recipe_id = r.id " +
		"WHERE r.name LIKE ? OR r.description LIKE ? OR r.Ingredients LIKE ? OR r.directions LIKE ? OR t.tag LIKE ?"
	countStmt := "SELECT count(DISTINCT r.id)" + partialStmt
	row := db.QueryRow(countStmt,
		search, search, search, search, search)
	err := row.Scan(&total)
	if err != nil {
		return 0, err
	}

	offset := count * (page - 1)
	selectStmt :=
		"SELECT DISTINCT r.id, r.name, r.description, r.ingredients, r.directions" + partialStmt + " ORDER BY r.name LIMIT ? OFFSET ?"
	rows, err := db.Query(selectStmt,
		search, search, search, search, search, count, offset)
	if err != nil {
		return 0, err
	}
	for rows.Next() {
		var recipe Recipe
		err = rows.Scan(&recipe.ID, &recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions)
		if err != nil {
			return 0, err
		}

		var imgs = new(RecipeImages)
		err = imgs.List(recipe.ID)
		if err != nil {
			return 0, err
		}
		if len(*imgs) > 0 {
			recipe.Image = (*imgs)[0].ThumbnailURL
		}

		*recipes = append(*recipes, recipe)
	}

	return total, nil
}
