package postgres

import (
	"github.com/jmoiron/sqlx"
)

type postgresTagDriver struct {
	*postgresDriver
}

func (d *postgresTagDriver) Create(recipeID int64, tag string) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(recipeID, tag, tx)
	})
}

func (d *postgresTagDriver) CreateTx(recipeID int64, tag string, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES ($1, $2)",
		recipeID, tag)
	return err
}

func (d *postgresTagDriver) DeleteAll(recipeID int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteAllTx(recipeID, tx)
	})
}

func (d *postgresTagDriver) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = $1",
		recipeID)
	return err
}

func (d *postgresTagDriver) List(recipeID int64) (*[]string, error) {
	var tags []string
	if err := m.db.Select(&tags, "SELECT tag FROM recipe_tag WHERE recipe_id = $1", recipeID); err != nil {
		return nil, err
	}

	return &tags, nil
}
