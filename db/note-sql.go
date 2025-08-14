package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlNoteDriver struct {
	Db *sqlx.DB
}

func (d *sqlNoteDriver) Create(note *models.Note) error {
	return tx(d.Db, func(db *sqlx.Tx) error {
		return d.createImpl(note, db)
	})
}

func (*sqlNoteDriver) createImpl(note *models.Note, db sqlx.Queryer) error {
	stmt := "INSERT INTO recipe_note (recipe_id, note) " +
		"VALUES ($1, $2) RETURNING id"

	return sqlx.Get(db, note, stmt, note.RecipeID, note.Text)
}

func (d *sqlNoteDriver) Update(note *models.Note) error {
	return tx(d.Db, func(db *sqlx.Tx) error {
		return d.updateImpl(note, db)
	})
}

func (*sqlNoteDriver) updateImpl(note *models.Note, db sqlx.Execer) error {
	_, err := db.Exec("UPDATE recipe_note SET note = $1 WHERE ID = $2 AND recipe_id = $3",
		note.Text, note.ID, note.RecipeID)
	return err
}

func (d *sqlNoteDriver) Delete(recipeID, noteID int64) error {
	return tx(d.Db, func(db *sqlx.Tx) error {
		return d.deleteImpl(recipeID, noteID, db)
	})
}

func (*sqlNoteDriver) deleteImpl(recipeID, noteID int64, db sqlx.Execer) error {
	_, err := db.Exec("DELETE FROM recipe_note WHERE id = $1 AND recipe_id = $2", noteID, recipeID)
	return err
}

func (d *sqlNoteDriver) DeleteAll(recipeID int64) error {
	return tx(d.Db, func(db *sqlx.Tx) error {
		return d.deleteAllImpl(recipeID, db)
	})
}

func (*sqlNoteDriver) deleteAllImpl(recipeID int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"DELETE FROM recipe_note WHERE recipe_id = $1",
		recipeID)
	return err
}

func (d *sqlNoteDriver) List(recipeID int64) (*[]models.Note, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]models.Note, error) {
		notes := make([]models.Note, 0)

		if err := sqlx.Select(db, &notes, "SELECT * FROM recipe_note WHERE recipe_id = $1 ORDER BY created_at DESC", recipeID); err != nil {
			return nil, err
		}

		return &notes, nil
	})
}
