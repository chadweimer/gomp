package db

import (
	"errors"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type postgresRecipeDriver struct {
	*postgresDriver
	*sqlRecipeDriver
}

func (d *postgresRecipeDriver) Create(recipe *models.Recipe) error {
	return tx(d.postgresDriver.Db, func(db sqlx.Ext) error {
		return d.createImpl(recipe, db)
	})
}

func (d *postgresRecipeDriver) createImpl(recipe *models.Recipe, db sqlx.Ext) error {
	stmt := "INSERT INTO recipe (name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url) " +
		"VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id"

	err := sqlx.Get(db, recipe, stmt,
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.StorageInstructions, recipe.SourceUrl)
	if err != nil {
		return fmt.Errorf("creating recipe: %w", err)
	}

	for _, tag := range recipe.Tags {
		if err := d.tags.createImpl(*recipe.Id, tag, db); err != nil {
			return fmt.Errorf("adding tags to new recipe: %w", err)
		}
	}

	return nil
}

func (d *postgresRecipeDriver) Read(id int64) (*models.Recipe, error) {
	stmt := "SELECT id, name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url, current_state, created_at, modified_at " +
		"FROM recipe WHERE id = $1"
	recipe := new(models.Recipe)
	if err := d.postgresDriver.Db.Get(recipe, stmt, id); err != nil {
		return nil, err
	}

	tags, err := d.tags.List(id)
	if err != nil {
		return nil, fmt.Errorf("reading tags for recipe: %w", err)
	}
	recipe.Tags = *tags

	return recipe, nil
}

func (d *postgresRecipeDriver) Update(recipe *models.Recipe) error {
	return tx(d.postgresDriver.Db, func(db sqlx.Ext) error {
		return d.updateImpl(recipe, db)
	})
}

func (d *postgresRecipeDriver) updateImpl(recipe *models.Recipe, db sqlx.Execer) error {
	if recipe.Id == nil {
		return errors.New("recipe id is required")
	}

	_, err := db.Exec(
		"UPDATE recipe "+
			"SET name = $1, serving_size = $2, nutrition_info = $3, ingredients = $4, directions = $5, storage_instructions = $6, source_url = $7 "+
			"WHERE id = $8",
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.StorageInstructions, recipe.SourceUrl, recipe.Id)
	if err != nil {
		return fmt.Errorf("updating recipe: %w", err)
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	if err = d.tags.deleteAllImpl(*recipe.Id, db); err != nil {
		return fmt.Errorf("deleting tags before updating on recipe: %w", err)
	}
	for _, tag := range recipe.Tags {
		if err = d.tags.createImpl(*recipe.Id, tag, db); err != nil {
			return fmt.Errorf("updating tags on recipe: %w", err)
		}
	}

	return nil
}

func (d *postgresRecipeDriver) Find(filter *models.SearchFilter, page int64, count int64) (*[]models.RecipeCompact, int64, error) {
	whereStmt := "WHERE r.current_state = 'active'"
	whereArgs := make([]interface{}, 0)
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

		// Build up the string of fields to query against
		fieldStr := ""
		fieldArgs := make([]interface{}, 0)
		for _, field := range supportedSearchFields {
			if containsField(filterFields, field) {
				if fieldStr != "" {
					fieldStr += " OR "
				}
				fieldStr += "to_tsvector('english', r." + string(field) + ") @@ plainto_tsquery(?)"
				fieldArgs = append(fieldArgs, filter.Query)
			}
		}

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
	countStmt := d.postgresDriver.Db.Rebind("SELECT count(r.id) FROM recipe AS r " + whereStmt)
	if err := d.postgresDriver.Db.Get(&total, countStmt, whereArgs...); err != nil {
		return nil, 0, err
	}

	offset := count * (page - 1)

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

	orderStmt += " LIMIT ? OFFSET ?"

	selectStmt := d.postgresDriver.Db.Rebind("SELECT " +
		"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating, COALESCE(i.thumbnail_url, '') AS thumbnail_url " +
		"FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
		"LEFT OUTER JOIN recipe_image as i ON r.image_id = i.id " +
		whereStmt + orderStmt)
	selectArgs := append(whereArgs, count, offset)

	var recipes []models.RecipeCompact
	if err = d.postgresDriver.Db.Select(&recipes, selectStmt, selectArgs...); err != nil {
		return nil, 0, err
	}

	return &recipes, total, nil
}
