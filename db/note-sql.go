package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlNoteDriver struct {
	*sqlDriver
}

func (d sqlNoteDriver) Create(note *models.Note) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(note, tx)
	})
}

func (d sqlNoteDriver) createtx(note *models.Note, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_note (recipe_id, note) " +
		"VALUES ($1, $2)"

	res, err := tx.Exec(stmt, note.RecipeID, note.Note)
	if err != nil {
		return err
	}
	note.ID, _ = res.LastInsertId()

	return nil
}

func (d sqlNoteDriver) Update(note *models.Note) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updatetx(note, tx)
	})
}

func (d sqlNoteDriver) updatetx(note *models.Note, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE recipe_note SET note = $1 WHERE ID = $2 AND recipe_id = $3",
		note.Note, note.ID, note.RecipeID)
	return err
}

func (d sqlNoteDriver) Delete(id int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deletetx(id, tx)
	})
}

func (d sqlNoteDriver) deletetx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe_note WHERE id = $1", id)
	return err
}

func (d sqlNoteDriver) DeleteAll(recipeID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deleteAlltx(recipeID, tx)
	})
}

func (d sqlNoteDriver) deleteAlltx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_note WHERE recipe_id = $1",
		recipeID)
	return err
}

func (d sqlNoteDriver) List(recipeID int64) (*[]models.Note, error) {
	var notes []models.Note

	if err := d.Db.Select(&notes, "SELECT * FROM recipe_note WHERE recipe_id = $1 ORDER BY created_at DESC", recipeID); err != nil {
		return nil, err
	}

	return &notes, nil
}
