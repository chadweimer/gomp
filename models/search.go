package models

const (
	// SortRecipeByName represents the value to use in SearchFilter.SortBy
	// in order to sort by the recipe name
	SortRecipeByName string = "name"
	// SortRecipeByID represents the value to use in SearchFilter.SortBy
	// in order to sort by the recipe ID
	SortRecipeByID string = "id"
	// SortRecipeByRating represents the value to use in SearchFilter.SortBy
	// in order to sort by the recipe rating
	SortRecipeByRating string = "rating"
	// SortRecipeByCreatedDate represents the value to use in SearchFilter.SortBy
	// in order to sort by the recipe created date
	SortRecipeByCreatedDate string = "created"
	// SortRecipeByModifiedDate represents the value to use in SearchFilter.SortBy
	// in order to sort by the recipe modified date
	SortRecipeByModifiedDate string = "modified"

	// SortTagByText represents the value to use in TagsFilter.SortBy
	// in order to sort by the tag value
	SortTagByText string = "tag"
	// SortTagByFrequency represents the value to use in TagsFilter.SortBy
	// in order to sort by the number of recipes using a tag
	SortTagByFrequency string = "frequency"

	// SortByRandom represents the value to use in SearchFilter.SortBy
	// and TagsFilter.SortBy in order to sort the results randomly
	SortByRandom string = "random"

	// SortDirAsc represents the value to use in SearchFilter.SortDir
	// and TagsFilter.SortDir in order to sort the results in ascending order.
	SortDirAsc string = "asc"
	// SortDirDesc represents the value to use in SearchFilter.SortDir
	// and TagsFilter.SortDir in order to sort the results in descending order.
	SortDirDesc string = "desc"
)

// SupportedSearchFields defines an array of field names that can be used
// in SearchFilter.Fields
var SupportedSearchFields = [...]string{"name", "ingredients", "directions"}

// SearchFilter is the primary model class for recipe search
type SearchFilter struct {
	Query        string   `json:"query" db:"query"`
	WithPictures *bool    `json:"withPictures" db:"with_pictures"`
	Fields       []string `json:"fields"`
	States       []string `json:"states"`
	Tags         []string `json:"tags"`
	SortBy       string   `json:"sortBy" db:"sort_by"`
	SortDir      string   `json:"sortDir" db:"sort_dir"`
}

// SavedSearchFilter represents a recipe search that is saved in the backing data store
type SavedSearchFilter struct {
	SearchFilter

	ID     int64  `json:"id" db:"id"`
	UserID int64  `json:"userId" db:"user_id"`
	Name   string `json:"name" db:"name"`
}
