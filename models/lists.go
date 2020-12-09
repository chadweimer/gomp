package models

import (
	"database/sql"
	"time"

	"github.com/jmoiron/sqlx"
)

// RecipeListCompact represents the metadata for a recipe list
type RecipeListCompact struct {
	ID         int64       `json:"id" db:"id"`
	Name       string      `json:"name" db:"name"`
	State      EntityState `json:"state" db:"current_state"`
	CreatedAt  time.Time   `json:"createdAt" db:"created_at"`
	ModifiedAt time.Time   `json:"modifiedAt" db:"modified_at"`
}

// RecipeListModel provides functionality to add and retrieve recipe lists
type RecipeListModel struct {
	*Model
}

// Create stores the recipe list in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *RecipeListModel) Create(list *RecipeListCompact) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(list, tx)
	})
}

// CreateTx stores the user in the database as a new record using
// the specified transaction.
func (m *RecipeListModel) CreateTx(list *RecipeListCompact, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_list (name) " +
		"VALUES ($1) RETURNING id"

	return tx.Get(list, stmt, list.Name)
}

// Read retrieves the information about the recipe list from the database, if found.
// If no recipe list exists with the specified ID, a NoRecordFound error is returned.
func (m *RecipeListModel) Read(id int64) (*RecipeListCompact, error) {
	list := new(RecipeListCompact)

	err := m.db.Get(list, "SELECT * FROM recipe_list WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return list, nil
}

// Update stores the recipe list in the database by updating the existing record with the specified
// id using a dedicated transation that is committed if there are not errors.
func (m *RecipeListModel) Update(list *RecipeListCompact) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateTx(list, tx)
	})
}

// UpdateTx stores the recipe list in the database by updating the existing record with the specified
// id using the specified transaction.
func (m *RecipeListModel) UpdateTx(list *RecipeListCompact, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE recipe_list SET name = $1, state = $2, modified_at = transaction_timestamp() WHERE ID = $3",
		list.Name, list.State, list.ID)
	return err
}

// Delete removes the specified recipe list from the database using a dedicated transation
// that is committed if there are not errors.
func (m *RecipeListModel) Delete(id int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified recipe list from the database using the specified transaction.
func (m *RecipeListModel) DeleteTx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe_list WHERE id = $1", id)
	return err
}

// List retrieves all recipe lists in the database.
func (m *RecipeListModel) List() (*[]RecipeListCompact, error) {
	var lists []RecipeListCompact

	if err := m.db.Select(&lists, "SELECT * FROM recipe_list ORDER BY name ASC"); err != nil {
		return nil, err
	}

	return &lists, nil
}
