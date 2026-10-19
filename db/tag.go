package db

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlTagDriver struct {
	Db *sqlx.DB
}

func (d *sqlTagDriver) List(ctx context.Context, sortBy models.TagSortBy, sortDir models.SortDir, page int64, count int64) (*[]models.Tag, int64, error) {
	var (
		total int64
		args  = make([]any, 0)
	)

	countStmt := "SELECT count(DISTINCT tag) FROM recipe_tag"
	if err := sqlx.GetContext(ctx, d.Db, &total, countStmt); err != nil {
		return nil, 0, err
	}

	orderStmt := getTagOrderStmt(sortBy, sortDir)

	limitStmt := ""
	if count >= 0 {
		limitStmt = "LIMIT ? OFFSET ?"
		args = append(args, count, count*(page-1))
	}

	selectStmt := d.Db.Rebind(fmt.Sprintf(
		"SELECT tag, count(tag) AS count FROM recipe_tag GROUP BY tag %s %s",
		orderStmt, limitStmt,
	))

	tags := make([]models.Tag, 0)
	if err := sqlx.SelectContext(ctx, d.Db, &tags, selectStmt, args...); err != nil {
		return nil, 0, err
	}

	return &tags, total, nil
}

func getTagOrderStmt(sortBy models.TagSortBy, sortDir models.SortDir) string {
	stmt := "ORDER BY "
	switch sortBy {
	case models.TagSortByCount:
		stmt += "count(tag)"
	case models.TagSortByTag:
		fallthrough
	default:
		stmt += "tag"
	}
	if sortDir == models.Desc {
		stmt += " DESC"
	} else {
		stmt += " ASC"
	}
	if sortBy == models.TagSortByCount {
		stmt += ", tag ASC"
	}

	return stmt
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

func fillTagsForRecipes[T models.TaggableRecipe](ctx context.Context, db *sqlx.DB, recipes ...T) error {
	if len(recipes) == 0 {
		return nil
	}

	recipeIDs := make([]int64, 0, len(recipes))
	for _, r := range recipes {
		var zero T
		if r == zero {
			continue
		}
		r.SetTags(make([]string, 0))
		if id := r.GetID(); id != nil {
			recipeIDs = append(recipeIDs, *id)
		}
	}

	if len(recipeIDs) == 0 {
		return nil
	}

	query, args, err := sqlx.In(
		"SELECT recipe_id, tag FROM recipe_tag WHERE recipe_id IN (?) ORDER BY recipe_id, tag ASC",
		recipeIDs,
	)
	if err != nil {
		return fmt.Errorf("building tags query: %w", err)
	}

	type recipeTagRow struct {
		RecipeID int64  `db:"recipe_id"`
		Tag      string `db:"tag"`
	}

	var rows []recipeTagRow
	if err := sqlx.SelectContext(ctx, db, &rows, db.Rebind(query), args...); err != nil {
		return fmt.Errorf("reading tags for recipes: %w", err)
	}

	tagsByRecipe := make(map[int64][]string, len(recipeIDs))
	for _, row := range rows {
		tagsByRecipe[row.RecipeID] = append(tagsByRecipe[row.RecipeID], row.Tag)
	}

	for _, r := range recipes {
		var zero T
		if r == zero {
			continue
		}
		if id := r.GetID(); id != nil {
			if tags, ok := tagsByRecipe[*id]; ok {
				r.SetTags(tags)
			}
		}
	}

	return nil
}
