package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlTagDriver struct {
	*sqlDriver
}

func (d sqlTagDriver) Create(recipeID int64, tag string) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(recipeID, tag, tx)
	})
}

func (d sqlTagDriver) createtx(recipeID int64, tag string, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES ($1, $2)",
		recipeID, tag)
	return err
}

func (d sqlTagDriver) DeleteAll(recipeID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deleteAlltx(recipeID, tx)
	})
}

func (d sqlTagDriver) deleteAlltx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = $1",
		recipeID)
	return err
}

func (d sqlTagDriver) List(recipeID int64) (*[]string, error) {
	var tags []string
	if err := d.Db.Select(&tags, "SELECT tag FROM recipe_tag WHERE recipe_id = $1", recipeID); err != nil {
		return nil, err
	}

	return &tags, nil
}

func (d sqlTagDriver) Find(filter *models.TagsFilter) (*[]string, error) {
	selectStmt := "SELECT tag, COUNT(tag) AS dups FROM recipe_tag GROUP BY tag ORDER BY "
	switch filter.SortBy {
	case models.SortTagByFrequency:
		selectStmt += "dups"
	case models.SortByRandom:
		selectStmt += "RANDOM()"
	case models.SortTagByText:
		fallthrough
	default:
		selectStmt += "tag"
	}
	if filter.SortDir == models.SortDirDesc {
		selectStmt += " DESC"
	}
	selectStmt += " LIMIT ?"
	selectStmt = d.Db.Rebind(selectStmt)
	rows, err := d.Db.Query(selectStmt, filter.Count)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var tag string
		var throwAway int
		if err := rows.Scan(&tag, &throwAway); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &tags, nil
}
