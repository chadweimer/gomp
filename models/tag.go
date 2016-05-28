package models

import "database/sql"

// TagModel provides functionality to edit and retrieve tags attached to recipes.
type TagModel struct {
	*Model
}

// Create stores the tag in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *TagModel) Create(recipeID int64, tag string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.CreateTx(recipeID, tag, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// CreateTx stores the tag in the database as a new record using
// the specified transaction.
func (m *TagModel) CreateTx(recipeID int64, tag string, tx *sql.Tx) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES (?, ?)",
		recipeID, tag)
	return err
}

// DeleteAll removes all tags for the specified recipe from the database using a dedicated
// transation that is committed if there are not errors.
func (m *TagModel) DeleteAll(recipeID int64) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.DeleteAllTx(recipeID, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteAllTx removes all tags for the specified recipe from the database using the specified
// transaction.
func (m *TagModel) DeleteAllTx(recipeID int64, tx *sql.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = ?",
		recipeID)
	return err
}

// List retrieves all tags associated with the recipe with the specified id.
func (m *TagModel) List(recipeID int64) (*[]string, error) {
	rows, err := m.db.Query(
		"SELECT tag FROM recipe_tag WHERE recipe_id = ?",
		recipeID)
	if err != nil {
		return nil, err
	}

	var tags []string
	for rows.Next() {
		var tag string
		err = rows.Scan(&tag)
		if err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	return &tags, nil
}
