package db

import (
	"database/sql"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqliteRecipeDriver struct {
	*sqliteDriver
	*sqlRecipeDriver
}

func (d *sqliteRecipeDriver) Create(recipe *models.Recipe) error {
	return d.sqliteDriver.tx(func(tx *sqlx.Tx) error {
		return d.createtx(recipe, tx)
	})
}

func (d *sqliteRecipeDriver) createtx(recipe *models.Recipe, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe (name, serving_size, nutrition_info, ingredients, directions, storage_instructions, source_url) " +
		"VALUES ($1, $2, $3, $4, $5, $6, $7)"

	res, err := tx.Exec(stmt,
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.StorageInstructions, recipe.SourceURL)
	if err != nil {
		return fmt.Errorf("creating recipe: %v", err)
	}
	recipe.ID, _ = res.LastInsertId()

	for _, tag := range recipe.Tags {
		err := d.tags.createtx(recipe.ID, tag, tx)
		if err != nil {
			return fmt.Errorf("adding tags to new recipe: %v", err)
		}
	}

	return nil
}

func (d *sqliteRecipeDriver) Read(id int64) (*models.Recipe, error) {
	stmt := "SELECT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, r.storage_instructions, r.source_url, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating " +
		"FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
		"WHERE r.id = $1"
	recipe := new(models.Recipe)
	err := d.sqliteDriver.Db.Get(recipe, stmt, id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("reading recipe: %v", err)
	}

	tags, err := d.tags.List(id)
	if err != nil {
		return nil, fmt.Errorf("reading tags for recipe: %v", err)
	}
	recipe.Tags = *tags

	return recipe, nil
}

func (d *sqliteRecipeDriver) Update(recipe *models.Recipe) error {
	return d.sqliteDriver.tx(func(tx *sqlx.Tx) error {
		return d.updatetx(recipe, tx)
	})
}

func (d *sqliteRecipeDriver) updatetx(recipe *models.Recipe, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET name = $1, serving_size = $2, nutrition_info = $3, ingredients = $4, directions = $5, storage_instructions = $6, source_url = $7 "+
			"WHERE id = $8",
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.StorageInstructions, recipe.SourceURL, recipe.ID)
	if err != nil {
		return fmt.Errorf("updating recipe: %v", err)
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	err = d.tags.deleteAlltx(recipe.ID, tx)
	if err != nil {
		return fmt.Errorf("deleting tags before updating on recipe: %v", err)
	}
	for _, tag := range recipe.Tags {
		err = d.tags.createtx(recipe.ID, tag, tx)
		if err != nil {
			return fmt.Errorf("updating tags on recipe: %v", err)
		}
	}

	return nil
}

func (d *sqliteRecipeDriver) Find(filter *models.SearchFilter, page int64, count int64) (*[]models.RecipeCompact, int64, error) {
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
		if filterFields == nil || len(filterFields) == 0 {
			filterFields = models.SupportedSearchFields[:]
		}

		// Build up the string of fields to query against
		fieldStr := ""
		fieldArgs := make([]interface{}, 0)
		for _, field := range models.SupportedSearchFields {
			if containsString(filterFields, field) {
				if fieldStr != "" {
					fieldStr += " OR "
				}
				fieldStr += "r." + field + " LIKE ?"
				fieldArgs = append(fieldArgs, "%"+filter.Query+"%")
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
	countStmt := d.sqliteDriver.Db.Rebind("SELECT count(r.id) FROM recipe AS r " + whereStmt)
	if err := d.sqliteDriver.Db.Get(&total, countStmt, whereArgs...); err != nil {
		return nil, 0, err
	}

	offset := count * (page - 1)

	orderStmt := " ORDER BY "
	switch filter.SortBy {
	case models.SortRecipeByID:
		orderStmt += "r.id"
	case models.SortRecipeByCreatedDate:
		orderStmt += "r.created_at"
	case models.SortRecipeByModifiedDate:
		orderStmt += "r.modified_at"
	case models.SortRecipeByRating:
		orderStmt += "avg_rating"
	case models.SortByRandom:
		orderStmt += "RANDOM()"
	case models.SortRecipeByName:
		fallthrough
	default:
		orderStmt += "r.name"
	}
	if filter.SortDir == models.SortDirDesc {
		orderStmt += " DESC"
	}
	// Need a special case for rating, since the way the execution plan works can
	// cause uncertain results due to many recipes having the same rating (ties).
	// By adding an additional sort to show recently modified recipes first,
	// this ensures a consistent result.
	if filter.SortBy == models.SortRecipeByRating {
		orderStmt += ", r.modified_at DESC"
	}

	orderStmt += " LIMIT ? OFFSET ?"

	selectStmt := d.sqliteDriver.Db.Rebind("SELECT " +
		"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating, COALESCE(i.thumbnail_url, '') AS thumbnail_url " +
		"FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
		"LEFT OUTER JOIN recipe_image as i ON r.image_id = i.id " +
		whereStmt + orderStmt)
	selectArgs := append(whereArgs, count, offset)

	var recipes []models.RecipeCompact
	err = d.sqliteDriver.Db.Select(&recipes, selectStmt, selectArgs...)
	if err != nil {
		return nil, 0, err
	}

	return &recipes, total, nil
}
