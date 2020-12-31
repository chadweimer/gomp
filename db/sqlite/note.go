package sqlite

import (
	"time"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqliteNoteDriver struct {
	*sqliteDriver
}

func (d sqliteNoteDriver) Create(note *models.Note) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(note, tx)
	})
}

func (d sqliteNoteDriver) CreateTx(note *models.Note, tx *sqlx.Tx) error {
	now := time.Now()
	stmt := "INSERT INTO recipe_note (recipe_id, note, created_at, modified_at) " +
		"VALUES ($1, $2, $3, $4) RETURNING id"

	return tx.Get(note, stmt, note.RecipeID, note.Note, now, now)
}

func (d sqliteNoteDriver) Update(note *models.Note) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.UpdateTx(note, tx)
	})
}

func (d sqliteNoteDriver) UpdateTx(note *models.Note, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE recipe_note SET note = $1, modified_at = $2 "+
		"WHERE ID = $3 AND recipe_id = $4",
		note.Note, time.Now(), note.ID, note.RecipeID)
	return err
}

func (d sqliteNoteDriver) Delete(id int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(id, tx)
	})
}

func (d sqliteNoteDriver) DeleteTx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe_note WHERE id = $1", id)
	return err
}

func (d sqliteNoteDriver) DeleteAll(recipeID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.DeleteAllTx(recipeID, tx)
	})
}

func (d sqliteNoteDriver) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_note WHERE recipe_id = $1",
		recipeID)
	return err
}

func (d sqliteNoteDriver) List(recipeID int64) (*[]models.Note, error) {
	var notes []models.Note

	if err := d.db.Select(&notes, "SELECT * FROM recipe_note WHERE recipe_id = $1 ORDER BY created_at DESC", recipeID); err != nil {
		return nil, err
	}

	return &notes, nil
}
