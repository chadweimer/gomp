package models

import "github.com/jmoiron/sqlx"

// SearchModel provides functionality to search recipes.
type SearchModel struct {
	*Model
}

const (
	SortByName   string = "name"
	SortByID     string = "id"
	SortByRating string = "rating"
	SortByRandom string = "random"

	SortDirAsc  string = "asc"
	SortDirDesc string = "desc"
)

// SearchFilter is the primary model class for recipe search
type SearchFilter struct {
	Query   string   `json:"query"`
	Tags    []string `json:"tags"`
	SortBy  string   `json:"sortBy"`
	SortDir string   `json:"sortDir"`
	Page    int64    `json:"page"`
	Count   int64    `json:"count"`
}

// Find retrieves all recipes matching the specified search filter and within the range specified,
// sorted by name.
func (m *SearchModel) Find(filter SearchFilter) (*Recipes, int64, error) {
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

	offset := filter.Count * (filter.Page - 1)
	selectStmt := "SELECT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, COALESCE((SELECT g.rating FROM recipe_rating AS g WHERE g.recipe_id = r.id), 0) AS overall_rating, COALESCE((SELECT thumbnail_url FROM recipe_image WHERE id = r.image_id), '')" +
		partialStmt
	switch filter.SortBy {
	case SortByID:
		selectStmt += " ORDER BY r.id"
	case SortByName:
		selectStmt += " ORDER BY r.name"
	case SortByRating:
		selectStmt += " ORDER BY overall_rating"
	case SortByRandom:
		selectStmt += " ORDER BY RANDOM()"
	}
	if filter.SortDir == SortDirDesc {
		selectStmt += " DESC"
	}
	selectStmt += " LIMIT ? OFFSET ?"
	var selectArgs []interface{}
	if len(filter.Tags) == 0 {
		selectStmt, selectArgs, err = sqlx.In(selectStmt, search, search, search, search, filter.Count, offset)
	} else {
		selectStmt, selectArgs, err = sqlx.In(selectStmt, search, search, search, search, filter.Tags, filter.Count, offset)
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
		recipe := Recipe{
			MainImage: RecipeImage{},
		}
		err = rows.Scan(
			&recipe.ID,
			&recipe.Name,
			&recipe.ServingSize,
			&recipe.NutritionInfo,
			&recipe.Ingredients,
			&recipe.Directions,
			&recipe.AvgRating,
			&recipe.MainImage.ThumbnailURL)
		if err != nil {
			return nil, 0, err
		}

		recipes = append(recipes, recipe)
	}

	return &recipes, total, nil
}
