package db

import (
	"context"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlNoteDriver struct {
	Db *sqlx.DB
}

func (d *sqlNoteDriver) Create(ctx context.Context, note *models.Note) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.createImpl(ctx, note, db)
	})
}

func (*sqlNoteDriver) createImpl(ctx context.Context, note *models.Note, db sqlx.QueryerContext) error {
	stmt := "INSERT INTO recipe_note (recipe_id, note) " +
		"VALUES ($1, $2) RETURNING id"

	return sqlx.GetContext(ctx, db, note, stmt, note.RecipeID, note.Text)
}

func (d *sqlNoteDriver) Update(ctx context.Context, note *models.Note) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.updateImpl(ctx, note, db)
	})
}

func (*sqlNoteDriver) updateImpl(ctx context.Context, note *models.Note, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx, "UPDATE recipe_note SET note = $1 WHERE ID = $2 AND recipe_id = $3",
		note.Text, note.ID, note.RecipeID)
	return err
}

func (d *sqlNoteDriver) Delete(ctx context.Context, recipeID, noteID int64) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.deleteImpl(ctx, recipeID, noteID, db)
	})
}

func (*sqlNoteDriver) deleteImpl(ctx context.Context, recipeID, noteID int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx, "DELETE FROM recipe_note WHERE id = $1 AND recipe_id = $2", noteID, recipeID)
	return err
}

func (d *sqlNoteDriver) DeleteAll(ctx context.Context, recipeID int64) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.deleteAllImpl(ctx, recipeID, db)
	})
}

func (*sqlNoteDriver) deleteAllImpl(ctx context.Context, recipeID int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx,
		"DELETE FROM recipe_note WHERE recipe_id = $1",
		recipeID)
	return err
}

func (d *sqlNoteDriver) List(ctx context.Context, recipeID int64) (*[]models.Note, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*[]models.Note, error) {
		notes := make([]models.Note, 0)

		if err := sqlx.SelectContext(ctx, db, &notes, "SELECT * FROM recipe_note WHERE recipe_id = $1 ORDER BY created_at DESC", recipeID); err != nil {
			return nil, err
		}

		return &notes, nil
	})
}
