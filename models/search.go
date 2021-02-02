package models

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

// SupportedSearchFields defines an array of field names that can be used
// in RecipesFilter.Fields
var SupportedSearchFields = [...]string{"name", "ingredients", "directions"}

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
