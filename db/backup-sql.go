package db

import (
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlBackupDriver struct {
	db *sqlx.DB
}

func (b *sqlBackupDriver) Create() (*models.BackupData, error) {
	return getTx(b.db, func(db sqlx.Queryer) (*models.BackupData, error) {
		// Query application configuration
		appConfig := models.AppConfiguration{}
		if err := sqlx.Get(db, &appConfig, "SELECT * FROM app_configuration"); err != nil {
			return nil, fmt.Errorf("querying app configuration: %w", err)
		}
		// Query all recipes
		recipes := make([]models.Recipe, 0)
		if err := sqlx.Select(db, &recipes, "SELECT * FROM recipe"); err != nil {
			return nil, fmt.Errorf("querying recipes: %w", err)
		}
		// Query all recipe links
		recipeLinks := make([]models.RecipeLink, 0)
		if err := sqlx.Select(db, &recipeLinks, "SELECT * FROM recipe_link"); err != nil {
			return nil, fmt.Errorf("querying recipe links: %w", err)
		}
		// Query all recipe notes
		recipeNotes := make([]models.Note, 0)
		if err := sqlx.Select(db, &recipeNotes, "SELECT * FROM recipe_note"); err != nil {
			return nil, fmt.Errorf("querying recipe notes: %w", err)
		}
		// Query all recipe images
		recipeImages := make([]models.RecipeImage, 0)
		if err := sqlx.Select(db, &recipeImages, "SELECT * FROM recipe_image"); err != nil {
			return nil, fmt.Errorf("querying recipe images: %w", err)
		}
		// Query all users
		users := make([]models.User, 0)
		if err := sqlx.Select(db, &users, "SELECT * FROM app_user"); err != nil {
			return nil, fmt.Errorf("querying users: %w", err)
		}
		// Query all user settings
		userSettings := make([]models.UserSettings, 0)
		if err := sqlx.Select(db, &userSettings, "SELECT * FROM user_settings"); err != nil {
			return nil, fmt.Errorf("querying user settings: %w", err)
		}
		// Query all search filters
		userSearchFilters := make([]models.SavedSearchFilter, 0)
		if err := sqlx.Select(db, &userSearchFilters, "SELECT * FROM search_filter"); err != nil {
			return nil, fmt.Errorf("querying search filters: %w", err)
		}
		return &models.BackupData{
			Recipes:          recipes,
			RecipeLinks:      recipeLinks,
			RecipeNotes:      recipeNotes,
			RecipeImages:     recipeImages,
			Users:            users,
			UserSettings:     userSettings,
			SearchFilters:    userSearchFilters,
			AppConfiguration: appConfig,
		}, nil
	})
}
