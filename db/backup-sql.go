package db

import (
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlBackupDriver struct {
	db *sqlx.DB
}

func (b *sqlBackupDriver) ExportRecipes() (*models.RecipesBackup, error) {
	exportedRecipes := &models.RecipesBackup{}
	err := tx(b.db, func(db sqlx.Ext) error {
		recipes, err := getRows(db, "recipe")
		if err != nil {
			return fmt.Errorf("querying recipes: %w", err)
		}
		exportedRecipes.Recipes = recipes

		notes, err := getRows(db, "recipe_note")
		if err != nil {
			return fmt.Errorf("querying recipe notes: %w", err)
		}
		exportedRecipes.Notes = notes

		links, err := getRows(db, "recipe_link")
		if err != nil {
			return fmt.Errorf("querying recipe links: %w", err)
		}
		exportedRecipes.Links = links

		images, err := getRows(db, "recipe_image")
		if err != nil {
			return fmt.Errorf("querying recipe images: %w", err)
		}
		exportedRecipes.Images = images

		tags, err := getRows(db, "recipe_tag")
		if err != nil {
			return fmt.Errorf("querying recipe tags: %w", err)
		}
		exportedRecipes.Tags = tags

		ratings, err := getRows(db, "recipe_rating")
		if err != nil {
			return fmt.Errorf("querying recipe ratings: %w", err)
		}
		exportedRecipes.Ratings = ratings

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("exporting recipes: %w", err)
	}
	return exportedRecipes, nil
}

func (b *sqlBackupDriver) ExportUsers() (*models.UsersBackup, error) {
	exportedUsers := &models.UsersBackup{}
	err := tx(b.db, func(db sqlx.Ext) error {
		users, err := getRows(db, "app_user")
		if err != nil {
			return fmt.Errorf("querying users: %w", err)
		}
		exportedUsers.Users = users

		favoriteTags, err := getRows(db, "app_user_favorite_tag")
		if err != nil {
			return fmt.Errorf("querying user favorite tags: %w", err)
		}
		exportedUsers.FavoriteTags = favoriteTags

		settings, err := getRows(db, "app_user_settings")
		if err != nil {
			return fmt.Errorf("querying user settings: %w", err)
		}
		exportedUsers.Settings = settings

		searchFilters, err := getRows(db, "search_filter")
		if err != nil {
			return fmt.Errorf("querying user search filters: %w", err)
		}
		exportedUsers.SearchFilters = searchFilters

		searchFilterFields, err := getRows(db, "search_filter_field")
		if err != nil {
			return fmt.Errorf("querying user search filter fields: %w", err)
		}
		exportedUsers.SearchFilterFields = searchFilterFields

		searchFilterStates, err := getRows(db, "search_filter_state")
		if err != nil {
			return fmt.Errorf("querying user search filter states: %w", err)
		}
		exportedUsers.SearchFilterStates = searchFilterStates

		searchFilterTags, err := getRows(db, "search_filter_tag")
		if err != nil {
			return fmt.Errorf("querying user search filter tags: %w", err)
		}
		exportedUsers.SearchFilterTags = searchFilterTags

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("exporting users: %w", err)
	}
	return exportedUsers, nil
}

func getRows(db sqlx.Queryer, tableName string) ([]models.RowData, error) {
	rows, err := db.Queryx(fmt.Sprintf("SELECT * FROM %s", tableName))
	if err != nil {
		return nil, fmt.Errorf("querying %s: %w", tableName, err)
	}
	defer rows.Close()

	data := make([]models.RowData, 0)
	for rows.Next() {
		row := models.RowData{}
		if err := rows.MapScan(row); err != nil {
			return nil, fmt.Errorf("scanning row: %w", err)
		}
		data = append(data, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating over rows: %w", err)
	}
	return data, nil
}
