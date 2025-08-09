package models

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen --config cfg.yaml ../models.yaml

// RowData represents a generic row of data, typically used for database rows
type RowData map[string]interface{}

// RecipesBackup represents the data structure used for backing up the recipes
type RecipesBackup struct {
	Recipes []RowData `json:"recipes"`
	Notes   []RowData `json:"notes"`
	Links   []RowData `json:"links"`
	Images  []RowData `json:"images"`
	Tags    []RowData `json:"tags"`
	Ratings []RowData `json:"ratings"`
}

// RecipeLink represents the links between recipes, allowing for connections such as "related recipes" or "similar recipes"
type RecipeLink struct {
	RecipeID     int64 `json:"recipe_id"`
	DestRecipeID int64 `json:"dest_recipe_id"`
}
