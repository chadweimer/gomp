package models

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen --config cfg.yaml ../models.yaml

// RowData represents a generic row of data, typically used for database rows
type RowData map[string]any

// TableData represents a table's data, including its name and the rows it contains
type TableData struct {
	TableName string    `json:"tableName"`
	Data      []RowData `json:"data"`
}

// Backup represents the data structure used for backing up the entire database
type Backup []TableData

// RecipeLink represents the links between recipes, allowing for connections such as "related recipes" or "similar recipes"
type RecipeLink struct {
	RecipeID     int64 `json:"recipe_id"`
	DestRecipeID int64 `json:"dest_recipe_id"`
}
