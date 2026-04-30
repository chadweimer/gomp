package db

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
)

type sqlTagDriver struct {
	Db *sqlx.DB
}

func (d *sqlTagDriver) List(ctx context.Context) (*map[string]int, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*map[string]int, error) {
		rows, err := db.QueryContext(ctx, "SELECT tag, count(tag) as num FROM recipe_tag GROUP BY tag")
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		tags := make(map[string]int)
		for rows.Next() {
			var tag string
			var count int
			if err := rows.Scan(&tag, &count); err != nil {
				return nil, fmt.Errorf("scanning tag row: %w", err)
			}
			tags[tag] = count
		}
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("iterating tag rows: %w", err)
		}

		return &tags, nil
	})
}

func createTagForRecipe(ctx context.Context, recipeID int64, tag string, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx,
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES ($1, $2)",
		recipeID, tag)
	return err
}

func deleteAllTagsFromRecipe(ctx context.Context, recipeID int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx,
		"DELETE FROM recipe_tag WHERE recipe_id = $1",
		recipeID)
	return err
}

func listTagsForRecipe(ctx context.Context, recipeID int64, db sqlx.QueryerContext) (*[]string, error) {
	tags := make([]string, 0)
	if err := sqlx.SelectContext(ctx, db, &tags, "SELECT tag FROM recipe_tag WHERE recipe_id = $1", recipeID); err != nil {
		return nil, err
	}

	return &tags, nil
}
