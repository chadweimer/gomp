package db

import (
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlBackupDriver struct {
	db *sqlx.DB
}

func (b *sqlBackupDriver) Create() (models.BackupData, error) {
	// TODO: Transactional backup

	// Query all recipes
	recipes := make([]models.Recipe, 0)
	if err := sqlx.Select(b.db, &recipes, "SELECT * FROM recipe"); err != nil {
		return models.BackupData{}, fmt.Errorf("querying recipes: %w", err)
	}
	// Query all users
	users := make([]models.User, 0)
	if err := sqlx.Select(b.db, &users, "SELECT * FROM app_user"); err != nil {
		return models.BackupData{}, fmt.Errorf("querying users: %w", err)
	}
	// Query all user settings
	userSettings := make([]models.UserSettings, 0)
	if err := sqlx.Select(b.db, &userSettings, "SELECT * FROM user_settings"); err != nil {
		return models.BackupData{}, fmt.Errorf("querying user settings: %w", err)
	}
	// Query all images
	images := make([]models.RecipeImage, 0)
	if err := sqlx.Select(b.db, &images, "SELECT * FROM recipe_image"); err != nil {
		return models.BackupData{}, fmt.Errorf("querying recipe images: %w", err)
	}
	return models.BackupData{
		Recipes:          recipes,
		RecipeLinks:      nil, // TODO: Query recipe links
		RecipeNotes:      nil, // TODO: Query notes
		RecipeImages:     images,
		Users:            users,
		UserSettings:     userSettings,
		SearchFilters:    nil,                       // TODO: Query search filters
		AppConfiguration: models.AppConfiguration{}, // TODO: Query app configuration
	}, nil
}
