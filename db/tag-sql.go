package db

import (
	"github.com/jmoiron/sqlx"
)

type sqlTagDriver struct {
	*sqlDriver
}

func (d *sqlTagDriver) Create(recipeId int64, tag string) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createImpl(recipeId, tag, db)
	})
}

func (*sqlTagDriver) createImpl(recipeId int64, tag string, db sqlx.Execer) error {
	_, err := db.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES ($1, $2)",
		recipeId, tag)
	return err
}

func (d *sqlTagDriver) DeleteAll(recipeId int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteAllImpl(recipeId, db)
	})
}

func (*sqlTagDriver) deleteAllImpl(recipeId int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = $1",
		recipeId)
	return err
}

func (d *sqlTagDriver) List(recipeId int64) (*[]string, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]string, error) {
		var tags []string
		if err := sqlx.Select(db, &tags, "SELECT tag FROM recipe_tag WHERE recipe_id = $1", recipeId); err != nil {
			return nil, err
		}

		return &tags, nil
	})
}
