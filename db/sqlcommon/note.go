package sqlcommon

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type NoteDriver struct {
	*Driver
}

func (d NoteDriver) Update(note *models.Note) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.UpdateTx(note, tx)
	})
}

func (d NoteDriver) UpdateTx(note *models.Note, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE recipe_note SET note = $1, modified_at = CURRENT_TIMESTAMP "+
		"WHERE ID = $2 AND recipe_id = $3",
		note.Note, note.ID, note.RecipeID)
	return err
}

func (d NoteDriver) Delete(id int64) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.DeleteTx(id, tx)
	})
}

func (d NoteDriver) DeleteTx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM recipe_note WHERE id = $1", id)
	return err
}

func (d NoteDriver) DeleteAll(recipeID int64) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.DeleteAllTx(recipeID, tx)
	})
}

func (d NoteDriver) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_note WHERE recipe_id = $1",
		recipeID)
	return err
}

func (d NoteDriver) List(recipeID int64) (*[]models.Note, error) {
	var notes []models.Note

	if err := d.Db.Select(&notes, "SELECT * FROM recipe_note WHERE recipe_id = $1 ORDER BY created_at DESC", recipeID); err != nil {
		return nil, err
	}

	return &notes, nil
}
