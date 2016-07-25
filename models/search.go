package models

import "github.com/jmoiron/sqlx"

// SearchModel provides functionality to search recipes.
type SearchModel struct {
	*Model
}

// SortBy represents an enumeration of possible sort fields
type SortBy int

const (
	SortByName   SortBy = 0
	SortByID     SortBy = 1
	SortByDate   SortBy = 2
	SortByRandom SortBy = 3
)

// SearchFilter is the primary model class for recipe search
type SearchFilter struct {
	Query  string
	Tags   []string
	SortBy SortBy
}

// Find retrieves all recipes matching the specified search filter and within the range specified,
// sorted by name.
func (m *SearchModel) Find(filter SearchFilter, page int64, count int64) (*Recipes, int64, error) {
	var total int64
	var search string
	if filter.Query == "" {
		search = "%"
	} else {
		search = "%" + filter.Query + "%"
	}
	partialStmt := "FROM recipe AS r " +
		"WHERE (r.name ILIKE ? OR r.Ingredients ILIKE ? OR r.directions ILIKE ? OR EXISTS (SELECT 1 FROM recipe_tag as t WHERE t.recipe_id = r.id AND t.tag ILIKE ?))"
	if len(filter.Tags) > 0 {
		partialStmt += " AND EXISTS (SELECT 1 FROM recipe_tag AS t WHERE t.recipe_id = r.id AND t.tag IN (?))"
	}

	countStmt := "SELECT count(r.id) " + partialStmt
	var err error
	var countArgs []interface{}
	if len(filter.Tags) == 0 {
		countStmt, countArgs, err = sqlx.In(countStmt, search, search, search, search)
	} else {
		countStmt, countArgs, err = sqlx.In(countStmt, search, search, search, search, filter.Tags)
	}
	if err != nil {
		return nil, 0, err
	}
	countStmt = m.db.Rebind(countStmt)
	row := m.db.QueryRow(countStmt, countArgs...)
	if err := row.Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := count * (page - 1)
	selectStmt := "SELECT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, COALESCE((SELECT g.rating FROM recipe_rating AS g WHERE g.recipe_id = r.id), 0), COALESCE((SELECT thumbnail_url FROM recipe_image WHERE recipe_id = r.id LIMIT 1), '')" +
		partialStmt
	switch filter.SortBy {
	case SortByID:
		selectStmt += " ORDER BY r.id"
	case SortByName:
		selectStmt += " ORDER BY r.name"
	// TODO: Don't have date columns yet
	//case SortByDate:
	//	selectStmt += " ORDER BY r.created_on"
	case SortByRandom:
		selectStmt += " ORDER BY RANDOM()"
	}
	selectStmt += " LIMIT ? OFFSET ?"
	var selectArgs []interface{}
	if len(filter.Tags) == 0 {
		selectStmt, selectArgs, err = sqlx.In(selectStmt, search, search, search, search, count, offset)
	} else {
		selectStmt, selectArgs, err = sqlx.In(selectStmt, search, search, search, search, filter.Tags, count, offset)
	}
	if err != nil {
		return nil, 0, err
	}
	selectStmt = m.db.Rebind(selectStmt)
	rows, err := m.db.Query(selectStmt, selectArgs...)
	if err != nil {
		return nil, 0, err
	}

	var recipes Recipes
	for rows.Next() {
		var recipe Recipe
		err = rows.Scan(
			&recipe.ID,
			&recipe.Name,
			&recipe.ServingSize,
			&recipe.NutritionInfo,
			&recipe.Ingredients,
			&recipe.Directions,
			&recipe.AvgRating,
			&recipe.Image)
		if err != nil {
			return nil, 0, err
		}

		recipes = append(recipes, recipe)
	}

	return &recipes, total, nil
}
