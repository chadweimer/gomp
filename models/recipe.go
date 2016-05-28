package models

import "database/sql"

// RecipeModel provides functionality to edit and retrieve recipes.
type RecipeModel struct {
	*Model
}

// Recipe is the primary model class for recipe storage and retrieval
type Recipe struct {
	ID          int64
	Name        string
	Description string
	Ingredients string
	Directions  string
	AvgRating   float64
	Image       string
	Tags        []string
}

// Recipes represents a collection of Recipe objects
type Recipes []Recipe

// Create stores the recipe in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *RecipeModel) Create(recipe *Recipe) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.CreateTx(recipe, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// CreateTx stores the recipe in the database as a new record using
// the specified transaction.
func (m *RecipeModel) CreateTx(recipe *Recipe, tx *sql.Tx) error {
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
		m.Tags.CreateTx(id, tag, tx)
		if err != nil {
			return err
		}
	}

	recipe.ID = id
	return nil
}

// Read retrieves the information about the recipe from the database, if found.
// If no recipe exists with the specified ID, a NoRecordFound error is returned.
func (m *RecipeModel) Read(id int64) (*Recipe, error) {
	recipe := Recipe{ID: id}

	result := m.db.QueryRow(
		"SELECT DISTINCT r.name, r.description, r.ingredients, r.directions, IFNULL(g.rating, 0) "+
			"FROM recipe AS r LEFT OUTER JOIN recipe_rating AS g ON g.recipe_id = r.id "+
			"WHERE r.id = ?",
		recipe.ID)
	err := result.Scan(&recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions, &recipe.AvgRating)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	tags, err := m.Tags.List(id)
	if err != nil {
		return nil, err
	}
	recipe.Tags = *tags

	return &recipe, nil
}

// Update stores the specified recipe in the database by updating the
// existing record with the sepcified id using a dedicated transation
// that is committed if there are not errors.
func (m *RecipeModel) Update(recipe *Recipe) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.UpdateTx(recipe, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// UpdateTx stores the specified recipe in the database by updating the
// existing record with the sepcified id using the specified transaction.
func (m *RecipeModel) UpdateTx(recipe *Recipe, tx *sql.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe SET name = ?, description = ?, ingredients = ?, directions = ? WHERE id = ?",
		recipe.Name, recipe.Description, recipe.Ingredients, recipe.Directions, recipe.ID)

	// TODO: Deleting and recreating seems inefficent and potentially error prone
	err = m.Tags.DeleteAllTx(recipe.ID, tx)
	if err != nil {
		return err
	}
	for _, tag := range recipe.Tags {
		err = m.Tags.CreateTx(recipe.ID, tag, tx)
		if err != nil {
			return err
		}
	}

	return nil
}

// Delete removes the specified recipe from the database using a dedicated transation
// that is committed if there are not errors. Note that this method does not delete
// any attachments that we associated with the deleted recipe.
func (m *RecipeModel) Delete(id int64) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.DeleteTx(id, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteTx removes the specified recipe from the database using the specified transaction.
// Note that this method does not delete any attachments that we associated with the deleted recipe.
func (m *RecipeModel) DeleteTx(id int64, tx *sql.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe WHERE id = ?", id)
	if err != nil {
		return err
	}

	err = m.Tags.DeleteAllTx(id, tx)
	if err != nil {
		return err
	}

	err = m.Notes.DeleteAllTx(id, tx)
	if err != nil {
		return err
	}

	_, err = tx.Exec("DELETE FROM recipe_rating WHERE recipe_id = ?", id)
	if err != nil {
		return err
	}

	return nil
}

// List retrieves all recipes within the range specified, sorted by name.
func (m *RecipeModel) List(page int64, count int64) (*Recipes, int64, error) {
	var total int64
	row := m.db.QueryRow("SELECT count(*) FROM recipe")
	err := row.Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := count * (page - 1)
	rows, err := m.db.Query(
		"SELECT r.id, r.name, r.description, r.ingredients, r.directions, IFNULL(g.rating, 0) "+
			"FROM recipe AS r LEFT OUTER JOIN recipe_rating AS g ON g.recipe_id = r.id "+
			"ORDER BY r.name LIMIT ? OFFSET ?",
		count, offset)
	if err != nil {
		return nil, 0, err
	}

	var recipes Recipes
	for rows.Next() {
		var recipe Recipe
		err = rows.Scan(&recipe.ID, &recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions, &recipe.AvgRating)
		if err != nil {
			return nil, 0, err
		}

		imgs, err := m.Images.List(recipe.ID)
		if err != nil {
			return nil, 0, err
		}
		if len(*imgs) > 0 {
			recipe.Image = (*imgs)[0].ThumbnailURL
		}

		recipes = append(recipes, recipe)
	}

	return &recipes, total, nil
}

// Find retrieves all recipes matching the specified search string and within the range specified,
// sorted by name.
func (m *RecipeModel) Find(search string, page int64, count int64) (*Recipes, int64, error) {
	var total int64
	search = "%" + search + "%"
	partialStmt := "FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_tag AS t ON t.recipe_id = r.id " +
		"LEFT OUTER JOIN recipe_rating AS g ON g.recipe_id = r.id " +
		"WHERE r.name LIKE ? OR r.description LIKE ? OR r.Ingredients LIKE ? OR r.directions LIKE ? OR t.tag LIKE ?"
	countStmt := "SELECT count(DISTINCT r.id) " + partialStmt
	row := m.db.QueryRow(countStmt,
		search, search, search, search, search)
	err := row.Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := count * (page - 1)
	selectStmt :=
		"SELECT r.id, r.name, r.description, r.ingredients, r.directions, IFNULL(g.rating, 0) " +
			partialStmt +
			" ORDER BY r.name LIMIT ? OFFSET ?"
	rows, err := m.db.Query(selectStmt,
		search, search, search, search, search, count, offset)
	if err != nil {
		return nil, 0, err
	}

	var recipes Recipes
	for rows.Next() {
		var recipe Recipe
		err = rows.Scan(&recipe.ID, &recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions, &recipe.AvgRating)
		if err != nil {
			return nil, 0, err
		}

		imgs, err := m.Images.List(recipe.ID)
		if err != nil {
			return nil, 0, err
		}
		if len(*imgs) > 0 {
			recipe.Image = (*imgs)[0].ThumbnailURL
		}

		recipes = append(recipes, recipe)
	}

	return &recipes, total, nil
}

// SetRating adds or updates the rating of the specified recipe.
func (m *RecipeModel) SetRating(id int64, rating float64) error {
	var count int64
	err := m.db.QueryRow("SELECT count(*) FROM recipe_rating WHERE recipe_id = ?", id).Scan(&count)
	if err == sql.ErrNoRows || count == 0 {
		_, err := m.db.Exec(
			"INSERT INTO recipe_rating (recipe_id, rating) VALUES (?, ?)", id, rating)
		return err
	}

	if err == nil {
		_, err = m.db.Exec(
			"UPDATE recipe_rating SET rating = ? WHERE recipe_id = ?", rating, id)
	}
	return err
}
