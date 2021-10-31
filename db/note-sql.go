package db

import (
	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
)

type sqlNoteDriver struct {
	*sqlDriver
}

func (d *sqlNoteDriver) Create(note *models.Note) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(note, tx)
	})
}

func (d *sqlNoteDriver) createtx(note *models.Note, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_note (recipe_id, note) " +
		"VALUES ($1, $2)"

	res, err := tx.Exec(stmt, note.RecipeId, note.Text)
	if err != nil {
		return err
	}
	noteId, _ := res.LastInsertId()
	note.Id = &noteId

	return nil
}

func (d *sqlNoteDriver) Update(note *models.Note) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updatetx(note, tx)
	})
}

func (d *sqlNoteDriver) updatetx(note *models.Note, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE recipe_note SET note = $1 WHERE ID = $2 AND recipe_id = $3",
		note.Text, note.Id, note.RecipeId)
	return err
}

func (d *sqlNoteDriver) Delete(recipeId, noteId int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deletetx(recipeId, noteId, tx)
	})
}

func (d *sqlNoteDriver) deletetx(recipeId, noteId int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe_note WHERE id = $1 AND recipe_id = $2", noteId, recipeId)
	return err
}

func (d *sqlNoteDriver) DeleteAll(recipeId int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deleteAlltx(recipeId, tx)
	})
}

func (d *sqlNoteDriver) deleteAlltx(recipeId int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_note WHERE recipe_id = $1",
		recipeId)
	return err
}

func (d *sqlNoteDriver) List(recipeId int64) (*[]models.Note, error) {
	var notes []models.Note

	if err := d.Db.Select(&notes, "SELECT * FROM recipe_note WHERE recipe_id = $1 ORDER BY created_at DESC", recipeId); err != nil {
		return nil, err
	}

	return &notes, nil
}
