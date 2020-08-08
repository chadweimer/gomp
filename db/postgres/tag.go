package postgres

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type postgresTagDriver struct {
	*postgresDriver
}

func (d *postgresTagDriver) Create(recipeID int64, tag string) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(recipeID, tag, tx)
	})
}

func (d *postgresTagDriver) CreateTx(recipeID int64, tag string, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES ($1, $2)",
		recipeID, tag)
	return err
}

func (d *postgresTagDriver) DeleteAll(recipeID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.DeleteAllTx(recipeID, tx)
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
	if err := d.db.Select(&tags, "SELECT tag FROM recipe_tag WHERE recipe_id = $1", recipeID); err != nil {
		return nil, err
	}

	return &tags, nil
}

func (d *postgresTagDriver) Find(filter *models.TagsFilter) (*[]string, error) {
	selectStmt := "SELECT tag, COUNT(tag) AS dups FROM recipe_tag GROUP BY tag ORDER BY "
	switch filter.SortBy {
	case SortTagByFrequency:
		selectStmt += "dups"
	case SortByRandom:
		selectStmt += "RANDOM()"
	case SortTagByText:
		fallthrough
	default:
		selectStmt += "tag"
	}
	if filter.SortDir == SortDirDesc {
		selectStmt += " DESC"
	}
	selectStmt += " LIMIT ?"
	selectStmt = d.db.Rebind(selectStmt)
	rows, err := d.db.Query(selectStmt, filter.Count)
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
