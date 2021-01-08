package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type postgresNoteDriver struct {
	*sqlNoteDriver
}

func (d *postgresNoteDriver) Create(note *models.Note) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(note, tx)
	})
}

func (d *postgresNoteDriver) createtx(note *models.Note, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_note (recipe_id, note) " +
		"VALUES ($1, $2) RETURNING id"

	return tx.Get(note, stmt, note.RecipeID, note.Note)
}
