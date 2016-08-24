package models

import (
	"time"

	"github.com/jmoiron/sqlx"
)

// NoteModel provides functionality to edit and retrieve notes attached to recipes.
type NoteModel struct {
	*Model
}

// Note represents an individual comment (or note) on a recipe
type Note struct {
	ID         int64     `json:"id"`
	RecipeID   int64     `json:"recipeId"`
	Note       string    `json:"text"`
	CreatedAt  time.Time `json:"createdAt"`
	ModifiedAt time.Time `json:"modifiedAt"`
}

// Notes represents a collection of Note objects
type Notes []Note

// Create stores the note in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *NoteModel) Create(note *Note) error {
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	if err = m.CreateTx(note, tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// CreateTx stores the note in the database as a new record using
// the specified transaction.
func (m *NoteModel) CreateTx(note *Note, tx *sqlx.Tx) error {
	now := time.Now()
	sql := "INSERT INTO recipe_note (recipe_id, note, created_at, modified_at) " +
		"VALUES ($1, $2, $3, $4) RETURNING id"

	var id int64
	row := tx.QueryRow(sql, note.RecipeID, note.Note, now, now)
	err := row.Scan(&id)
	if err != nil {
		return err
	}

	note.ID = id
	return nil
}

// Update stores the note in the database by updating the existing record with the specified
// id using a dedicated transation that is committed if there are not errors.
func (m *NoteModel) Update(note *Note) error {
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	if err = m.UpdateTx(note, tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
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
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	if err = m.DeleteTx(id, tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// DeleteTx removes the specified note from the database using the specified transaction.
func (m *NoteModel) DeleteTx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe_note WHERE id = $1", id)
	return err
}

// DeleteAll removes all notes for the specified recipe from the database using a dedicated
// transation that is committed if there are not errors.
func (m *NoteModel) DeleteAll(recipeID int64) error {
	tx, err := m.db.Beginx()
	if err != nil {
		return err
	}

	if err = m.DeleteAllTx(recipeID, tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
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
func (m *NoteModel) List(recipeID int64) (*Notes, error) {
	rows, err := m.db.Query(
		"SELECT id, note, created_at, modified_at FROM recipe_note "+
			"WHERE recipe_id = $1 ORDER BY created_at DESC",
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
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &notes, nil
}
