package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqliteRecipeDriver struct {
	*sqlRecipeDriver
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
				fieldStr += "r." + string(field) + " LIKE ?"
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
	countStmt := d.Db.Rebind("SELECT count(r.id) FROM recipe AS r " + whereStmt)
	if err := d.Db.Get(&total, countStmt, whereArgs...); err != nil {
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

	selectStmt := d.Db.Rebind("SELECT " +
		"r.id, r.name, r.current_state, r.created_at, r.modified_at, COALESCE(g.rating, 0) AS avg_rating, COALESCE(i.thumbnail_url, '') AS thumbnail_url " +
		"FROM recipe AS r " +
		"LEFT OUTER JOIN recipe_rating as g ON r.id = g.recipe_id " +
		"LEFT OUTER JOIN recipe_image as i ON r.image_id = i.id " +
		whereStmt + orderStmt)
	selectArgs := append(whereArgs, count, offset)

	var recipes []models.RecipeCompact
	if err = d.Db.Select(&recipes, selectStmt, selectArgs...); err != nil {
		return nil, 0, err
	}

	return &recipes, total, nil
}
