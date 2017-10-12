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
	whereStmt := ""
	whereArgs := make([]interface{}, 0)

	if filter.Query != "" {
		whereStmt += " WHERE to_tsvector('english', r.name || ' ' || r.ingredients || ' ' || r.directions) @@ plainto_tsquery(?)"
		whereArgs = append(whereArgs, filter.Query)
	}

	if len(filter.Tags) > 0 {
		tagsStmt, tagsArgs, err := sqlx.In("EXISTS (SELECT 1 FROM recipe_tag AS t WHERE t.recipe_id = r.id AND t.tag IN (?))", filter.Tags)
		if err != nil {
			return nil, 0, err
		}
		if whereStmt == "" {
			whereStmt += " WHERE "
		} else {
			whereStmt += " AND "
		}
		whereStmt += tagsStmt
		whereArgs = append(whereArgs, tagsArgs...)
	}

	var total int64
	countStmt := m.db.Rebind("SELECT count(r.id) FROM recipe AS r" + whereStmt)
	if err := m.db.Get(&total, countStmt, whereArgs...); err != nil {
		return nil, 0, err
	}

	offset := filter.Count * (filter.Page - 1)

	orderStmt := " ORDER BY "
	switch filter.SortBy {
	case SortRecipeByID:
		orderStmt += "r.id"
	case SortRecipeByRating:
		orderStmt += "avg_rating"
	case SortByRandom:
		orderStmt += "RANDOM()"
	case SortRecipeByName:
		fallthrough
	default:
		orderStmt += "r.name"
	}
	if filter.SortDir == SortDirDesc {
		orderStmt += " DESC"
	}
	orderStmt += " LIMIT ? OFFSET ?"

	selectStmt := m.db.Rebind("SELECT " +
		"r.id, r.name, r.serving_size, r.nutrition_info, r.ingredients, r.directions, COALESCE((SELECT g.rating FROM recipe_rating AS g WHERE g.recipe_id = r.id), 0) AS avg_rating, COALESCE((SELECT thumbnail_url FROM recipe_image WHERE id = r.image_id), '')" +
		"FROM recipe AS r" +
		whereStmt + orderStmt)
	selectArgs := append(whereArgs, filter.Count, offset)
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
		err := rows.Scan(
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
	selectStmt := "SELECT tag, COUNT(tag) AS dups FROM recipe_tag GROUP BY tag ORDER BY "
	switch filter.SortBy {
	case SortTagByFrequency:
		selectStmt += "dups"
	case SortByRandom:
		selectStmt += "RANDOM()"
	case SortTagByText:
		fallthrough
	default:
		selectStmt += "tag"
	}
	if filter.SortDir == SortDirDesc {
		selectStmt += " DESC"
	}
	selectStmt += " LIMIT ?"
	selectStmt = m.db.Rebind(selectStmt)
	rows, err := m.db.Query(selectStmt, filter.Count)
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
