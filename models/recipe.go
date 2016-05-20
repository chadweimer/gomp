package models

import "database/sql"

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
		"SELECT name, description, ingredients, directions FROM recipe WHERE id = ?",
		recipe.ID)
	err := result.Scan(&recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions)
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

func (m *RecipeModel) DeleteTx(id int64, tx *sql.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe WHERE id = ?", id)
	if err != nil {
		return err
	}

	err = m.Tags.DeleteAllTx(id, tx)
	if err != nil {
		return err
	}

	return nil
}

func (m *RecipeModel) List(page int64, count int64) (*Recipes, int64, error) {
	var total int64
	row := m.db.QueryRow("SELECT count(*) FROM recipe")
	err := row.Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := count * (page - 1)
	rows, err := m.db.Query(
		"SELECT id, name, description, ingredients,  directions FROM recipe ORDER BY name LIMIT ? OFFSET ?",
		count, offset)
	if err != nil {
		return nil, 0, err
	}

	var recipes Recipes
	for rows.Next() {
		var recipe Recipe
		err = rows.Scan(&recipe.ID, &recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions)
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

func (m *RecipeModel) Find(search string, page int64, count int64) (*Recipes, int64, error) {
	var total int64
	search = "%" + search + "%"
	partialStmt := " FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_tag AS t ON t.recipe_id = r.id " +
		"WHERE r.name LIKE ? OR r.description LIKE ? OR r.Ingredients LIKE ? OR r.directions LIKE ? OR t.tag LIKE ?"
	countStmt := "SELECT count(DISTINCT r.id)" + partialStmt
	row := m.db.QueryRow(countStmt,
		search, search, search, search, search)
	err := row.Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := count * (page - 1)
	selectStmt :=
		"SELECT DISTINCT r.id, r.name, r.description, r.ingredients, r.directions" + partialStmt + " ORDER BY r.name LIMIT ? OFFSET ?"
	rows, err := m.db.Query(selectStmt,
		search, search, search, search, search, count, offset)
	if err != nil {
		return nil, 0, err
	}

	var recipes Recipes
	for rows.Next() {
		var recipe Recipe
		err = rows.Scan(&recipe.ID, &recipe.Name, &recipe.Description, &recipe.Ingredients, &recipe.Directions)
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
