package models

import (
	"time"

	"github.com/jmoiron/sqlx"
)

// NoteModel provides functionality to edit and retrieve notes attached to recipes.
//
// swagger:ignore
type NoteModel struct {
	*Model
}

// Note represents an individual comment (or note) on a recipe
//
// swagger:model note
type Note struct {
	ID         int64     `json:"id" db:"id"`
	RecipeID   int64     `json:"recipeId" db:"recipe_id"`
	Note       string    `json:"text" db:"note"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
	ModifiedAt time.Time `json:"modifiedAt" db:"modified_at"`
}

// Create stores the note in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *NoteModel) Create(note *Note) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(note, tx)
	})
}

// CreateTx stores the note in the database as a new record using
// the specified transaction.
func (m *NoteModel) CreateTx(note *Note, tx *sqlx.Tx) error {
	now := time.Now()
	stmt := "INSERT INTO recipe_note (recipe_id, note, created_at, modified_at) " +
		"VALUES ($1, $2, $3, $4) RETURNING id"

	return tx.Get(note, stmt, note.RecipeID, note.Note, now, now)
}

// Update stores the note in the database by updating the existing record with the specified
// id using a dedicated transation that is committed if there are not errors.
func (m *NoteModel) Update(note *Note) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.UpdateTx(note, tx)
	})
}

// UpdateTx stores the note in the database by updating the existing record with the specified
// id using the specified transaction.
func (m *NoteModel) UpdateTx(note *Note, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE recipe_note SET note = $1, modified_at = $2 "+
		"WHERE ID = $3 AND recipe_id = $4",
		note.Note, time.Now(), note.ID, note.RecipeID)
	return err
}

// Delete removes the specified note from the database using a dedicated transation
// that is committed if there are not errors.
func (m *NoteModel) Delete(id int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteTx(id, tx)
	})
}

// DeleteTx removes the specified note from the database using the specified transaction.
func (m *NoteModel) DeleteTx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe_note WHERE id = $1", id)
	return err
}

// DeleteAll removes all notes for the specified recipe from the database using a dedicated
// transation that is committed if there are not errors.
func (m *NoteModel) DeleteAll(recipeID int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteAllTx(recipeID, tx)
	})
}

// DeleteAllTx removes all notes for the specified recipe from the database using the specified
// transaction.
func (m *NoteModel) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_note WHERE recipe_id = $1",
		recipeID)
	return err
}

// List retrieves all notes associated with the recipe with the specified id.
func (m *NoteModel) List(recipeID int64) (*[]Note, error) {
	var notes []Note

	if err := m.db.Select(&notes, "SELECT * FROM recipe_note WHERE recipe_id = $1 ORDER BY created_at DESC", recipeID); err != nil {
		return nil, err
	}

	return &notes, nil
}
