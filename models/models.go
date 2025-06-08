package models

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen --config cfg.yaml ../models.yaml

// BackupData represents the data structure used for backing up the application state
type BackupData struct {
	Recipes          []Recipe            `json:"recipes"`
	RecipeLinks      []RecipeLink        `json:"recipe_links"`
	RecipeNotes      []Note              `json:"recipe_notes"`
	RecipeImages     []RecipeImage       `json:"recipe_images"`
	Users            []User              `json:"users"`
	UserSettings     []UserSettings      `json:"user_settings"`
	SearchFilters    []SavedSearchFilter `json:"search_filters"`
	AppConfiguration AppConfiguration    `json:"app_configuration"`
}

// RecipeLink represents the links between recipes, allowing for connections such as "related recipes" or "similar recipes"
type RecipeLink struct {
	RecipeID     int64 `json:"recipe_id"`
	DestRecipeID int64 `json:"dest_recipe_id"`
}
