package db

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlRecipeDriverAdapter interface {
	GetSearchFields(filterFields []models.SearchField, query string) (string, []any)
}

type sqlRecipeDriver struct {
	Db      *sqlx.DB
	adapter sqlRecipeDriverAdapter
}

var supportedSearchFields = [...]models.SearchField{
	models.SearchFieldName,
	models.SearchFieldIngredients,
	models.SearchFieldDirections,
	models.SearchFieldStorageInstructions,
	models.SearchFieldNutrition,
}

func (d *sqlRecipeDriver) Create(recipe *models.Recipe) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createImpl(recipe, db)
	})
}

func (d *sqlRecipeDriver) createImpl(recipe *models.Recipe, db sqlx.Ext) error {
	stmt := "INSERT INTO recipe (name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url, recipe_time) " +
		"VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id"

	err := sqlx.Get(db, recipe, stmt,
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.StorageInstructions, recipe.SourceUrl, recipe.Time)
	if err != nil {
		return fmt.Errorf("creating recipe: %w", err)
	}

	for _, tag := range recipe.Tags {
		if err := d.createTagImpl(*recipe.Id, tag, db); err != nil {
			return fmt.Errorf("adding tags to new recipe: %w", err)
		}
	}

	return nil
}

func (d *sqlRecipeDriver) Read(id int64) (*models.Recipe, error) {
	return get(d.Db, func(q sqlx.Queryer) (*models.Recipe, error) {
		stmt := "SELECT id, name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url, recipe_time, current_state, created_at, modified_at " +
			"FROM recipe WHERE id = $1"
		recipe := new(models.Recipe)
		if err := sqlx.Get(q, recipe, stmt, id); err != nil {
			return nil, err
		}

		tags, err := d.ListTags(id)
		if err != nil {
			return nil, fmt.Errorf("reading tags for recipe: %w", err)
		}
		recipe.Tags = *tags

		return recipe, nil
	})
}

func (d *sqlRecipeDriver) Update(recipe *models.Recipe) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updateImpl(recipe, db)
	})
}

func (d *sqlRecipeDriver) updateImpl(recipe *models.Recipe, db sqlx.Execer) error {
	if recipe.Id == nil {
		return ErrMissingId
	}

	_, err := db.Exec(
		"UPDATE recipe "+
			"SET name = $1, serving_size = $2, nutrition_info = $3, ingredients = $4, directions = $5, storage_instructions = $6, source_url = $7, recipe_time = $8 "+
			"WHERE id = $9",
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.StorageInstructions, recipe.SourceUrl, recipe.Time, recipe.Id)
	if err != nil {
		return fmt.Errorf("updating recipe: %w", err)
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	if err = d.deleteAllTagsImpl(*recipe.Id, db); err != nil {
		return fmt.Errorf("deleting tags before updating on recipe: %w", err)
	}
	for _, tag := range recipe.Tags {
		if err = d.createTagImpl(*recipe.Id, tag, db); err != nil {
			return fmt.Errorf("updating tags on recipe: %w", err)
		}
	}

	return nil
}

func (d *sqlRecipeDriver) Delete(id int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteImpl(id, db)
	})
}

func (*sqlRecipeDriver) deleteImpl(id int64, db sqlx.Execer) error {
	if _, err := db.Exec("DELETE FROM recipe WHERE id = $1", id); err != nil {
		return fmt.Errorf("deleting recipe: %w", err)
	}

	return nil
}

func (d *sqlRecipeDriver) GetRating(id int64) (*float32, error) {
	return get(d.Db, func(db sqlx.Queryer) (*float32, error) {
		var rating float32
		err := sqlx.Get(db, &rating,
			"SELECT COALESCE(g.rating, 0) AS avg_rating FROM recipe AS r "+
				"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id "+
				"WHERE r.id = $1", id)
		if err != nil {
			return nil, fmt.Errorf("updating recipe state: %w", err)
		}

		return &rating, nil
	})
}

func (d *sqlRecipeDriver) SetRating(id int64, rating float32) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		count := -1
		err := sqlx.Get(db, &count, "SELECT count(*) FROM recipe_rating WHERE recipe_id = $1", id)

		if errors.Is(err, sql.ErrNoRows) || count == 0 {
			_, err = db.Exec(
				"INSERT INTO recipe_rating (recipe_id, rating) VALUES ($1, $2)", id, rating)
			if err != nil {
				return fmt.Errorf("creating recipe rating: %w", err)
			}
		} else if err == nil {
			_, err = db.Exec(
				"UPDATE recipe_rating SET rating = $1 WHERE recipe_id = $2", rating, id)
		}

		if err != nil {
			return fmt.Errorf("updating recipe rating: %w", err)
		}

		return nil
	})
}

func (d *sqlRecipeDriver) SetState(id int64, state models.RecipeState) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		_, err := db.Exec(
			"UPDATE recipe SET current_state = $1 WHERE id = $2", state, id)
		if err != nil {
			return fmt.Errorf("updating recipe state: %w", err)
		}

		return nil
	})
}

func (d *sqlRecipeDriver) Find(filter *models.SearchFilter, page int64, count int64) (*[]models.RecipeCompact, int64, error) {
	whereStmt := "WHERE r.current_state = 'active'"
	whereArgs := make([]any, 0)
	var err error

	if len(filter.States) > 0 {
		whereStmt, whereArgs, err = sqlx.In("WHERE r.current_state IN (?)", filter.States)
		if err != nil {
			return nil, 0, err
		}
	}

	if filter.Query != "" {
		// If the filter didn't specify the fields to search on, use all of them
		filterFields := filter.Fields
		if len(filterFields) == 0 {
			filterFields = supportedSearchFields[:]
		}

		fieldStr, fieldArgs := d.adapter.GetSearchFields(filterFields, filter.Query)

		whereStmt += " AND (" + fieldStr + ")"
		whereArgs = append(whereArgs, fieldArgs...)
	}

	if len(filter.Tags) > 0 {
		tagsStmt, tagsArgs, err := sqlx.In("EXISTS (SELECT 1 FROM recipe_tag AS t WHERE t.recipe_id = r.id AND t.tag IN (?))", filter.Tags)
		if err != nil {
			return nil, 0, err
		}

		whereStmt += " AND " + tagsStmt
		whereArgs = append(whereArgs, tagsArgs...)
	}

	if filter.WithPictures != nil {
		picsStmt := ""
		if *filter.WithPictures {
			picsStmt = "EXISTS (SELECT 1 FROM recipe_image AS t WHERE t.recipe_id = r.id)"
		} else {
			picsStmt = "NOT EXISTS (SELECT 1 FROM recipe_image AS t WHERE t.recipe_id = r.id)"
		}
		whereStmt += " AND " + picsStmt
	}

	var total int64
	countStmt := d.Db.Rebind("SELECT count(r.id) FROM recipe AS r " + whereStmt)
	if err := sqlx.Get(d.Db, &total, countStmt, whereArgs...); err != nil {
		return nil, 0, err
	}

	orderStmt := " ORDER BY "
	switch filter.SortBy {
	case models.SortById:
		orderStmt += "r.id"
	case models.SortByCreated:
		orderStmt += "r.created_at"
	case models.SortByModified:
		orderStmt += "r.modified_at"
	case models.SortByRating:
		orderStmt += "avg_rating"
	case models.SortByRandom:
		orderStmt += "RANDOM()"
	case models.SortByName:
		fallthrough
	default:
		orderStmt += "r.name"
	}
	if filter.SortDir == models.Desc {
		orderStmt += " DESC"
	}
	// Need a special case for rating, since the way the execution plan works can
	// cause uncertain results due to many recipes having the same rating (ties).
	// By adding an additional sort to show recently modified recipes first,
	// this ensures a consistent result.
	if filter.SortBy == models.SortByRating {
		orderStmt += ", r.modified_at DESC"
	}

	// Build the offset and limit
	selectArgs := whereArgs
	if count > 0 {
		orderStmt += " LIMIT ? OFFSET ?"
		selectArgs = append(selectArgs, count, count*(page-1))
	}

	selectStmt := d.Db.Rebind("SELECT " +
		"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating, COALESCE(i.thumbnail_url, '') AS thumbnail_url " +
		"FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
		"LEFT OUTER JOIN recipe_image as i ON r.image_id = i.id " +
		whereStmt + orderStmt)

	var recipes []models.RecipeCompact
	if err = sqlx.Select(d.Db, &recipes, selectStmt, selectArgs...); err != nil {
		return nil, 0, err
	}

	return &recipes, total, nil
}

func (d *sqlRecipeDriver) CreateTag(recipeId int64, tag string) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createTagImpl(recipeId, tag, db)
	})
}

func (*sqlRecipeDriver) createTagImpl(recipeId int64, tag string, db sqlx.Execer) error {
	_, err := db.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES ($1, $2)",
		recipeId, tag)
	return err
}

func (d *sqlRecipeDriver) DeleteAllTags(recipeId int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteAllTagsImpl(recipeId, db)
	})
}

func (*sqlRecipeDriver) deleteAllTagsImpl(recipeId int64, db sqlx.Execer) error {
	_, err := db.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = $1",
		recipeId)
	return err
}

func (d *sqlRecipeDriver) ListTags(recipeId int64) (*[]string, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]string, error) {
		var tags []string
		if err := sqlx.Select(db, &tags, "SELECT tag FROM recipe_tag WHERE recipe_id = $1", recipeId); err != nil {
			return nil, err
		}

		return &tags, nil
	})
}
