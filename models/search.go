package models

import "github.com/jmoiron/sqlx"

const (
	// SortRecipeByName represents the value to use in RecipesFilter.SortBy
	// in order to sort by the recipe name
	SortRecipeByName string = "name"
	// SortRecipeByID represents the value to use in RecipesFilter.SortBy
	// in order to sort by the recipe ID
	SortRecipeByID string = "id"
	// SortRecipeByRating represents the value to use in RecipesFilter.SortBy
	// in order to sort by the recipe rating
	SortRecipeByRating string = "rating"

	// SortTagByText represents the value to use in TagsFilter.SortBy
	// in order to sort by the tag value
	SortTagByText string = "tag"
	// SortTagByFrequency represents the value to use in TagsFilter.SortBy
	// in order to sort by the number of recipes using a tag
	SortTagByFrequency string = "frequency"

	// SortByRandom represents the value to use in RecipesFilter.SortBy
	// and TagsFilter.SortBy in order to sort the results randomly
	SortByRandom string = "random"

	// SortDirAsc represents the value to use in RecipesFilter.SortDir
	// and TagsFilter.SortDir in order to sort the results in ascending order.
	SortDirAsc string = "asc"
	// SortDirDesc represents the value to use in RecipesFilter.SortDir
	// and TagsFilter.SortDir in order to sort the results in descending order.
	SortDirDesc string = "desc"
)

// SearchModel provides functionality to search recipes.
type SearchModel struct {
	*Model
}

// RecipesFilter is the primary model class for recipe search
type RecipesFilter struct {
	Query   string   `json:"query"`
	Tags    []string `json:"tags"`
	SortBy  string   `json:"sortBy"`
	SortDir string   `json:"sortDir"`
	Page    int64    `json:"page"`
	Count   int64    `json:"count"`
}

// TagsFilter is the primary model class for tag search
type TagsFilter struct {
	SortBy  string `json:"sortBy"`
	SortDir string `json:"sortDir"`
	Count   int64  `json:"count"`
}

// FindRecipes retrieves all recipes matching the specified search filter and within the range specified.
func (m *SearchModel) FindRecipes(filter RecipesFilter) (*Recipes, int64, error) {
	var total int64
	var err error

	fromStmt := "FROM recipe AS r"

	queryStmt := ""
	queryArgs := make([]interface{}, 0)
	if filter.Query != "" {
		var err error
		queryStmt, queryArgs, err = sqlx.In("to_tsvector('english', r.name || ' ' || r.ingredients || ' ' || r.directions) @@ plainto_tsquery(?)", filter.Query)
		if err != nil {
			return nil, 0, err
		}
	}

	tagsStmt := ""
	tagsArgs := make([]interface{}, 0)
	if len(filter.Tags) > 0 {
		tagsStmt, tagsArgs, err = sqlx.In("EXISTS (SELECT 1 FROM recipe_tag AS t WHERE t.recipe_id = r.id AND t.tag IN (?))", filter.Tags)
		if err != nil {
			return nil, 0, err
		}
	}

	whereStmt := ""
	whereArgs := append(queryArgs, tagsArgs...)
	if queryStmt != "" {
		whereStmt += " WHERE " + queryStmt
	}
	if tagsStmt != "" {
		if whereStmt == "" {
			whereStmt += " WHERE " + tagsStmt
		} else {
			whereStmt += " AND " + tagsStmt
		}
	}

	countStmt := m.db.Rebind("SELECT count(r.id) " + fromStmt + whereStmt)
	if err := m.db.Get(&total, countStmt, whereArgs...); err != nil {
		return nil, 0, err
	}

	offset := filter.Count * (filter.Page - 1)

	var orderStmt string
	var orderArgs []interface{}
	switch filter.SortBy {
	case SortRecipeByID:
		orderStmt += " ORDER BY r.id"
	case SortRecipeByRating:
		orderStmt += " ORDER BY avg_rating"
	case SortByRandom:
		orderStmt += " ORDER BY RANDOM()"
	case SortRecipeByName:
		fallthrough
	default:
		orderStmt += " ORDER BY r.name"
	}
	switch filter.SortDir {
	case SortDirDesc:
		orderStmt += " DESC"
	case SortDirAsc:
		fallthrough
	default:
		orderStmt += " ASC"
	}
	orderStmt += " LIMIT ? OFFSET ?"
	orderStmt, orderArgs, err = sqlx.In(orderStmt, filter.Count, offset)
	if err != nil {
		return nil, 0, err
	}

	selectStmt := m.db.Rebind("SELECT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, COALESCE((SELECT g.rating FROM recipe_rating AS g WHERE g.recipe_id = r.id), 0) AS avg_rating, COALESCE((SELECT thumbnail_url FROM recipe_image WHERE id = r.image_id), '')" +
		fromStmt + whereStmt + orderStmt)
	selectArgs := append(whereArgs, orderArgs...)
	rows, err := m.db.Query(selectStmt, selectArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

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
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return &recipes, total, nil
}

// FindTags retrieves all tags matching the specified search filter and within the range specified.
func (m *SearchModel) FindTags(filter TagsFilter) (*[]string, error) {
	selectStmt := "SELECT tag, COUNT(tag) AS dups FROM recipe_tag GROUP BY tag"
	switch filter.SortBy {
	case SortTagByText:
		selectStmt += " ORDER BY tag"
	case SortTagByFrequency:
		selectStmt += " ORDER BY dups"
	case SortByRandom:
		selectStmt += " ORDER BY RANDOM()"
	}
	if filter.SortDir == SortDirDesc {
		selectStmt += " DESC"
	}
	selectStmt += " LIMIT $1"
	rows, err := m.db.Query(
		selectStmt, filter.Count)
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
