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

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("exporting recipes: %w", err)
	}
	return exportedRecipes, nil
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
