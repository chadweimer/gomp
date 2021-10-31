package db

import (
	"github.com/jmoiron/sqlx"
)

type sqlTagDriver struct {
	*sqlDriver
}

func (d *sqlTagDriver) Create(recipeId int64, tag string) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(recipeId, tag, tx)
	})
}

func (d *sqlTagDriver) createtx(recipeId int64, tag string, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES ($1, $2)",
		recipeId, tag)
	return err
}

func (d *sqlTagDriver) DeleteAll(recipeId int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deleteAlltx(recipeId, tx)
	})
}

func (d *sqlTagDriver) deleteAlltx(recipeId int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = $1",
		recipeId)
	return err
}

func (d *sqlTagDriver) List(recipeId int64) (*[]string, error) {
	var tags []string
	if err := d.Db.Select(&tags, "SELECT tag FROM recipe_tag WHERE recipe_id = $1", recipeId); err != nil {
		return nil, err
	}

	return &tags, nil
}
