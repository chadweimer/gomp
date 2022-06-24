package db

import (
	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
)

type sqlNoteDriver struct {
	*sqlDriver
}

func (d *sqlNoteDriver) Create(note *models.Note) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createImpl(note, db)
	})
}

func (*sqlNoteDriver) createImpl(note *models.Note, db sqlx.Execer) error {
	stmt := "INSERT INTO recipe_note (recipe_id, note) " +
		"VALUES ($1, $2)"

	res, err := db.Exec(stmt, note.RecipeId, note.Text)
	if err != nil {
		return err
	}
	noteId, _ := res.LastInsertId()
	note.Id = &noteId

	return nil
}

func (d *sqlNoteDriver) Update(note *models.Note) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updateImpl(note, db)
	})
}

func (*sqlNoteDriver) updateImpl(note *models.Note, db sqlx.Execer) error {
	_, err := db.Exec("UPDATE recipe_note SET note = $1 WHERE ID = $2 AND recipe_id = $3",
		note.Text, note.Id, note.RecipeId)
	return err
}

func (d *sqlNoteDriver) Delete(recipeId, noteId int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteImpl(recipeId, noteId, db)
	})
}

func (*sqlNoteDriver) deleteImpl(recipeId, noteId int64, db sqlx.Execer) error {
	_, err := db.Exec("DELETE FROM recipe_note WHERE id = $1 AND recipe_id = $2", noteId, recipeId)
	return err
}

func (d *sqlNoteDriver) DeleteAll(recipeId int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteAllImpl(recipeId, db)
	})
}

func (*sqlNoteDriver) deleteAllImpl(recipeId int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"DELETE FROM recipe_note WHERE recipe_id = $1",
		recipeId)
	return err
}

func (d *sqlNoteDriver) List(recipeId int64) (*[]models.Note, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]models.Note, error) {
		var notes []models.Note

		if err := sqlx.Select(db, &notes, "SELECT * FROM recipe_note WHERE recipe_id = $1 ORDER BY created_at DESC", recipeId); err != nil {
			return nil, err
		}

		return &notes, nil
	})
}
