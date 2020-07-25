package models

import (
	"strings"

	"github.com/jmoiron/sqlx"
)

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
	// SortRecipeByCreatedDate represents the value to use in RecipesFilter.SortBy
	// in order to sort by the recipe created date
	SortRecipeByCreatedDate string = "created"
	// SortRecipeByModifiedDate represents the value to use in RecipesFilter.SortBy
	// in order to sort by the recipe modified date
	SortRecipeByModifiedDate string = "modified"

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

// SupportedFields defines an array of field names that can be used
// in RecipesFilter.Fields
var SupportedFields = [...]string{"name", "ingredients", "directions"}

// SearchModel provides functionality to search recipes.
type SearchModel struct {
	*Model
}

// RecipesFilter is the primary model class for recipe search
type RecipesFilter struct {
	Query    string   `json:"query"`
	Fields   []string `json:"fields"`
	Tags     []string `json:"tags"`
	Pictures []string `json:"pictures"`
	States   []string `json:"states"`
	SortBy   string   `json:"sortBy"`
	SortDir  string   `json:"sortDir"`
	Page     int64    `json:"page"`
	Count    int64    `json:"count"`
}

// TagsFilter is the primary model class for tag search
type TagsFilter struct {
	SortBy  string `json:"sortBy"`
	SortDir string `json:"sortDir"`
	Count   int64  `json:"count"`
}

// RecipeCompact is the primary model class for bulk recipe retrieval
type RecipeCompact struct {
	recipeBase

	ThumbnailURL string `json:"thumbnailUrl" db:"thumbnail_url"`
}

// FindRecipes retrieves all recipes matching the specified search filter and within the range specified.
func (m *SearchModel) FindRecipes(filter RecipesFilter) (*[]RecipeCompact, int64, error) {
	whereStmt := ""
	whereArgs := make([]interface{}, 0)
	var err error

	if len(filter.States) > 0 {
		whereStmt, whereArgs, err = sqlx.In(" WHERE r.current_state IN (?))", filter.States)
		if err != nil {
			return nil, 0, err
		}
	} else {
		whereStmt = " WHERE r.current_state = 'active'"
	}

	if filter.Query != "" {
		// If the filter didn't specify the fields to search on, use all of them
		filterFields := filter.Fields
		if filterFields == nil || len(filterFields) == 0 {
			filterFields = SupportedFields[:]
		}

		// Build up the string of fields to query against
		fieldStr := ""
		fieldArgs := make([]interface{}, 0)
		for _, field := range SupportedFields {
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
	countStmt := m.db.Rebind("SELECT count(r.id) FROM recipe AS r" + whereStmt)
	if err := m.db.Get(&total, countStmt, whereArgs...); err != nil {
		return nil, 0, err
	}

	offset := filter.Count * (filter.Page - 1)

	orderStmt := " ORDER BY "
	switch filter.SortBy {
	case SortRecipeByID:
		orderStmt += "r.id"
	case SortRecipeByCreatedDate:
		orderStmt += "r.created_at"
	case SortRecipeByModifiedDate:
		orderStmt += "r.modified_at"
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
		"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE((SELECT g.rating FROM recipe_rating AS g WHERE g.recipe_id = r.id), 0) AS avg_rating, COALESCE((SELECT thumbnail_url FROM recipe_image WHERE id = r.image_id), '') AS thumbnail_url " +
		"FROM recipe AS r" +
		whereStmt + orderStmt)
	selectArgs := append(whereArgs, filter.Count, offset)

	var recipes []RecipeCompact
	err = m.db.Select(&recipes, selectStmt, selectArgs...)
	if err != nil {
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
