package models

import "github.com/jmoiron/sqlx"

// SearchModel provides functionality to search recipes.
type SearchModel struct {
	*Model
}

// SearchFilter is the primary model class for recipe search
type SearchFilter struct {
	Query string
	Tags  []string
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
	var like string
	switch m.cfg.DatabaseDriver {
	case "sqlite3":
		like = "LIKE"
	case "postgres":
		like = "ILIKE"
	}
	partialStmt := "FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_tag AS t ON t.recipe_id = r.id " +
		"LEFT OUTER JOIN recipe_rating AS g ON g.recipe_id = r.id " +
		"WHERE (r.name " + like + " ? OR r.Ingredients " + like + " ? OR r.directions " + like + " ? OR t.tag " + like + " ?)"
	if len(filter.Tags) > 0 {
		partialStmt = partialStmt + " AND (t.tag IN (?))"
	}

	countStmt := "SELECT count(DISTINCT r.id) " + partialStmt
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
	selectStmt := "SELECT DISTINCT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, COALESCE(g.rating, 0) " +
		partialStmt +
		" ORDER BY r.name LIMIT ? OFFSET ?"
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
			&recipe.AvgRating)
		if err != nil {
			return nil, 0, err
		}

		imgs, err := m.Images.List(recipe.ID)
		if err != nil {
			return nil, 0, err
		}
		if len(*imgs) > 0 {
			recipe.Image = (*imgs)[0].ThumbnailURL
		}

		recipes = append(recipes, recipe)
	}

	return &recipes, total, nil
}
