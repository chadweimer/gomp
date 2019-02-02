package models

import "github.com/jmoiron/sqlx"

// TagModel provides functionality to edit and retrieve tags attached to recipes.
//
// swagger:ignore
type TagModel struct {
	*Model
}

// Create stores the tag in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *TagModel) Create(recipeID int64, tag string) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(recipeID, tag, tx)
	})
}

// CreateTx stores the tag in the database as a new record using
// the specified transaction.
func (m *TagModel) CreateTx(recipeID int64, tag string, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES ($1, $2)",
		recipeID, tag)
	return err
}

// DeleteAll removes all tags for the specified recipe from the database using a dedicated
// transation that is committed if there are not errors.
func (m *TagModel) DeleteAll(recipeID int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteAllTx(recipeID, tx)
	})
}

// DeleteAllTx removes all tags for the specified recipe from the database using the specified
// transaction.
func (m *TagModel) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = $1",
		recipeID)
	return err
}

// List retrieves all tags associated with the recipe with the specified id.
func (m *TagModel) List(recipeID int64) (*[]string, error) {
	var tags []string
	if err := m.db.Select(&tags, "SELECT tag FROM recipe_tag WHERE recipe_id = $1", recipeID); err != nil {
		return nil, err
	}

	return &tags, nil
}
