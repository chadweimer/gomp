package postgres

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/db/sqlcommon"
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type recipeDriver struct {
	*driver
	*sqlcommon.RecipeDriver
}

func newRecipeDriver(driver *driver) *recipeDriver {
	return &recipeDriver{
		driver:       driver,
		RecipeDriver: &sqlcommon.RecipeDriver{Driver: driver.Driver},
	}
}

// Create stores the recipe in the database as a new record using
// a dedicated transaction that is committed if there are not errors.
func (d *recipeDriver) Create(recipe *models.Recipe) error {
	return d.driver.Tx(func(tx *sqlx.Tx) error {
		return d.CreateTx(recipe, tx)
	})
}

// CreateTx stores the recipe in the database as a new record using
// the specified transaction.
func (d *recipeDriver) CreateTx(recipe *models.Recipe, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe (name, serving_size, nutrition_info, ingredients, directions, source_url) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	err := tx.Get(recipe, stmt,
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.SourceURL)
	if err != nil {
		return fmt.Errorf("creating recipe: %v", err)
	}

	for _, tag := range recipe.Tags {
		err := d.tags.CreateTx(recipe.ID, tag, tx)
		if err != nil {
			return fmt.Errorf("adding tags to new recipe: %v", err)
		}
	}

	return nil
}

// Read retrieves the information about the recipe from the database, if found.
// If no recipe exists with the specified ID, a NoRecordFound error is returned.
func (d *recipeDriver) Read(id int64) (*models.Recipe, error) {
	stmt := "SELECT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, r.source_url, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating " +
		"FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
		"WHERE r.id = $1"
	recipe := new(models.Recipe)
	err := d.driver.Db.Get(recipe, stmt, id)
	if err == sql.ErrNoRows {
		return nil, db.ErrNotFound
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

// Update stores the specified recipe in the database by updating the
// existing record with the specified id using a dedicated transaction
// that is committed if there are not errors.
func (d *recipeDriver) Update(recipe *models.Recipe) error {
	return d.driver.Tx(func(tx *sqlx.Tx) error {
		return d.UpdateTx(recipe, tx)
	})
}

// UpdateTx stores the specified recipe in the database by updating the
// existing record with the specified id using the specified transaction.
func (d *recipeDriver) UpdateTx(recipe *models.Recipe, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE recipe "+
			"SET name = $1, serving_size = $2, nutrition_info = $3, ingredients = $4, directions = $5, source_url = $6 "+
			"WHERE id = $7",
		recipe.Name, recipe.ServingSize, recipe.NutritionInfo, recipe.Ingredients, recipe.Directions, recipe.SourceURL, recipe.ID)
	if err != nil {
		return fmt.Errorf("updating recipe: %v", err)
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	err = d.tags.DeleteAllTx(recipe.ID, tx)
	if err != nil {
		return fmt.Errorf("deleting tags before updating on recipe: %v", err)
	}
	for _, tag := range recipe.Tags {
		err = d.tags.CreateTx(recipe.ID, tag, tx)
		if err != nil {
			return fmt.Errorf("updating tags on recipe: %v", err)
		}
	}

	return nil
}

// Find retrieves all recipes matching the specified search filter and within the range specified.
func (d *recipeDriver) Find(filter *models.RecipesFilter) (*[]models.RecipeCompact, int64, error) {
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
				fieldStr += "to_tsvector('english', r." + field + ") @@ plainto_tsquery(?)"
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

	if len(filter.Pictures) > 0 {
		picsParts := make([]string, 0)
		for _, val := range filter.Pictures {
			switch strings.ToLower(val) {
			case "yes":
				picsParts = append(picsParts, "EXISTS (SELECT 1 FROM recipe_image AS t WHERE t.recipe_id = r.id)")
			case "no":
				picsParts = append(picsParts, "NOT EXISTS (SELECT 1 FROM recipe_image AS t WHERE t.recipe_id = r.id)")
			}
		}
		picsStmt := ""
		if len(picsParts) > 0 {
			picsStmt = "(" + strings.Join(picsParts, " OR ") + ")"
		}

		whereStmt += " AND " + picsStmt
	}

	var total int64
	countStmt := d.driver.Db.Rebind("SELECT count(r.id) FROM recipe AS r " + whereStmt)
	if err := d.driver.Db.Get(&total, countStmt, whereArgs...); err != nil {
		return nil, 0, err
	}

	offset := filter.Count * (filter.Page - 1)

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
	orderStmt += " LIMIT ? OFFSET ?"

	selectStmt := d.driver.Db.Rebind("SELECT " +
		"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating, COALESCE(i.thumbnail_url, '') AS thumbnail_url " +
		"FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
		"LEFT OUTER JOIN recipe_image as i ON r.image_id = i.id " +
		whereStmt + orderStmt)
	selectArgs := append(whereArgs, filter.Count, offset)

	var recipes []models.RecipeCompact
	err = d.driver.Db.Select(&recipes, selectStmt, selectArgs...)
	if err != nil {
		return nil, 0, err
	}

	return &recipes, total, nil
}

func containsString(arr []string, str string) bool {
	for _, a := range arr {
		if a == str {
			return true
		}
	}
	return false
}
