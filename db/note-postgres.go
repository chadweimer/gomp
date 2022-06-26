package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type postgresNoteDriver struct {
	*sqlNoteDriver
}

func (d *postgresNoteDriver) Create(note *models.Note) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createImpl(note, db)
	})
}

func (*postgresNoteDriver) createImpl(note *models.Note, db sqlx.Queryer) error {
	stmt := "INSERT INTO recipe_note (recipe_id, note) " +
		"VALUES ($1, $2) RETURNING id"

	return sqlx.Get(db, note, stmt, note.RecipeId, note.Text)
}
