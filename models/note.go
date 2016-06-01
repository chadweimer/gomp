package models

import (
	"database/sql"
	"time"
)

// NoteModel provides functionality to edit and retrieve notes attached to recipes.
type NoteModel struct {
	*Model
}

// Note represents an individual comment (or note) on a recipe
type Note struct {
	ID         int64
	RecipeID   int64
	Note       string
	CreatedAt  time.Time
	ModifiedAt time.Time
}

// Notes represents a collection of Note objects
type Notes []Note

// Create stores the note in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *NoteModel) Create(note *Note) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.CreateTx(note, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// CreateTx stores the note in the database as a new record using
// the specified transaction.
func (m *NoteModel) CreateTx(note *Note, tx *sql.Tx) error {
	result, err := tx.Exec(
		"INSERT INTO recipe_note (recipe_id, note, created_at, modified_at) VALUES (?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))",
		note.RecipeID, note.Note)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	note.ID = id
	return nil
}

// Update stores the note in the database by updating the existing record with the specified
// id using a dedicated transation that is committed if there are not errors.
func (m *NoteModel) Update(note *Note) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.UpdateTx(note, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// UpdateTx stores the note in the database by updating the existing record with the specified
// id using the specified transaction.
func (m *NoteModel) UpdateTx(note *Note, tx *sql.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe_note SET note = ?, modified_at = datetime('now', 'localtime') WHERE ID = ? AND recipe_id = ?",
		note.Note, note.ID, note.RecipeID)
	return err
}

// Delete removes the specified note from the database using a dedicated transation
// that is committed if there are not errors.
func (m *NoteModel) Delete(id int64) error {
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

// DeleteTx removes the specified note from the database using the specified transaction.
func (m *NoteModel) DeleteTx(id int64, tx *sql.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe_note WHERE id = ?", id)
	return err
}

// DeleteAll removes all notes for the specified recipe from the database using a dedicated
// transation that is committed if there are not errors.
func (m *NoteModel) DeleteAll(recipeID int64) error {
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

// DeleteAllTx removes all notes for the specified recipe from the database using the specified
// transaction.
func (m *NoteModel) DeleteAllTx(recipeID int64, tx *sql.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_note WHERE recipe_id = ?",
		recipeID)
	return err
}

// List retrieves all notes associated with the recipe with the specified id.
func (m *NoteModel) List(recipeID int64) (*Notes, error) {
	rows, err := m.db.Query(
		"SELECT id, note, created_at, modified_at FROM recipe_note WHERE recipe_id = ? ORDER BY created_at DESC",
		recipeID)
	if err != nil {
		return nil, err
	}

	var notes Notes
	for rows.Next() {
		var note Note
		err = rows.Scan(&note.ID, &note.Note, &note.CreatedAt, &note.ModifiedAt)
		if err != nil {
			return nil, err
		}
		notes = append(notes, note)
	}

	return &notes, nil
}
