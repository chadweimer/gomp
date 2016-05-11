package models

import "time"

type Note struct {
	ID         int64
	RecipeID   int64
	Note       string
	CreatedAt  time.Time
	ModifiedAt time.Time
}

type Notes []Note

func (note *Note) Create() error {
	tx, err := DB.Sql.Begin();
	if err != nil {
		return err
	}

	err = note.CreateTx(tx)
    if err != nil {
        return err
    }

    return tx.Commit()
}

func (note *Note) CreateTx(tx DbTx) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_note (recipe_id, note, created_at, modified_at) VALUES (?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))",
		note.RecipeID, note.Note)
	return err
}

func (notes *Notes) List(recipeID int64) error {
	rows, err := DB.Sql.Query(
		"SELECT id, note, created_at, modified_at FROM recipe_note WHERE recipe_id = ? ORDER BY created_at DESC",
		recipeID)
	if err != nil {
		return err
	}

	for rows.Next() {
		var note Note
		err = rows.Scan(&note.ID, &note.Note, &note.CreatedAt, &note.ModifiedAt)
		if err != nil {
			return err
		}
		*notes = append(*notes, note)
	}

	return nil
}
