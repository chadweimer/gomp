package models

import (
	"database/sql"
	"time"
)

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

// List retrieces all notes associated with the recipe with the specified id.
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
