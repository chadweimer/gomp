package db

import (
	"errors"

	"github.com/chadweimer/gomp/models"
)

// ---- Begin Standard Errors ----

// ErrNotFound represents the error when a database record cannot be
// found matching the criteria specified by the caller
var ErrNotFound = errors.New("No record found matching supplied criteria")

// ---- End Standard Errors ----

// Driver represents the interface of a backing data store
type Driver interface {
	Close() error

	Recipes() RecipeDriver
	Tags() TagDriver
	Notes() NoteDriver
	Images() RecipeImageDriver
	Links() LinkDriver
	Users() UserDriver
}

// LinkDriver provides functionality to edit and retrieve recipe links.
type LinkDriver interface {
	// Create stores a link between 2 recipes in the database as a new record
	// using a dedicated transation that is committed if there are not errors.
	Create(recipeID, destRecipeID int64) error

	// Delete removes the linked recipe from the database using a dedicated transation
	// that is committed if there are not errors.
	Delete(recipeID, destRecipeID int64) error

	// List retrieves all recipes linked to recipe with the specified id.
	List(recipeID int64) (*[]models.RecipeCompact, error)
}

// NoteDriver provides functionality to edit and retrieve notes attached to recipes.
type NoteDriver interface {
	// Create stores the note in the database as a new record using
	// a dedicated transation that is committed if there are not errors.
	Create(note *models.Note) error

	// Update stores the note in the database by updating the existing record with the specified
	// id using a dedicated transation that is committed if there are not errors.
	Update(note *models.Note) error

	// Delete removes the specified note from the database using a dedicated transation
	// that is committed if there are not errors.
	Delete(id int64) error

	// DeleteAll removes all notes for the specified recipe from the database using a dedicated
	// transation that is committed if there are not errors.
	DeleteAll(recipeID int64) error

	// List retrieves all notes associated with the recipe with the specified id.
	List(recipeID int64) (*[]models.Note, error)
}

// RecipeDriver provides functionality to edit and retrieve recipes.
type RecipeDriver interface {
	// Create stores the recipe in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	Create(recipe *models.Recipe) error

	// Read retrieves the information about the recipe from the database, if found.
	// If no recipe exists with the specified ID, a NoRecordFound error is returned.
	Read(id int64) (*models.Recipe, error)

	// Update stores the specified recipe in the database by updating the
	// existing record with the specified id using a dedicated transaction
	// that is committed if there are not errors.
	Update(recipe *models.Recipe) error

	// Delete removes the specified recipe from the database using a dedicated transaction
	// that is committed if there are not errors. Note that this method does not delete
	// any attachments that we associated with the deleted recipe.
	Delete(id int64) error

	// SetRating adds or updates the rating of the specified recipe.
	SetRating(id int64, rating float64) error

	// SetState updates the state of the specified recipe.
	SetState(id int64, state models.RecipeState) error

	// Find retrieves all recipes matching the specified search filter and within the range specified.
	Find(filter *models.RecipesFilter) (*[]models.RecipeCompact, int64, error)
}

// TagDriver provides functionality to edit and retrieve tags attached to recipes.
type TagDriver interface {
	// Create stores the tag in the database as a new record using
	// a dedicated transation that is committed if there are not errors.
	Create(recipeID int64, tag string) error

	// DeleteAll removes all tags for the specified recipe from the database using a dedicated
	// transation that is committed if there are not errors.
	DeleteAll(recipeID int64) error

	// List retrieves all tags associated with the recipe with the specified id.
	List(recipeID int64) (*[]string, error)

	// Find retrieves all tags matching the specified search filter and within the range specified.
	Find(filter *models.TagsFilter) (*[]string, error)
}

// UserDriver provides functionality to edit and authenticate users.
type UserDriver interface {
	// Authenticate verifies the username and password combination match an existing user
	Authenticate(username, password string) (*models.User, error)

	// Create stores the user in the database as a new record using
	// a dedicated transation that is committed if there are not errors.
	Create(user *models.User) error

	// Read retrieves the information about the user from the database, if found.
	// If no user exists with the specified ID, a NoRecordFound error is returned.
	Read(id int64) (*models.User, error)

	// Update stores the user in the database by updating the existing record with the specified
	// id using a dedicated transation that is committed if there are not errors.
	Update(user *models.User) error

	// UpdatePassword updates the associated user's password, first verifying that the existing
	// password is correct, using a dedicated transation that is committed if there are not errors.
	UpdatePassword(id int64, password, newPassword string) error

	// ReadSettings retrieves the settings for the specified user from the database, if found.
	// If no user exists with the specified ID, a NoRecordFound error is returned.
	ReadSettings(id int64) (*models.UserSettings, error)

	// UpdateSettings stores the specified user settings in the database by updating the
	// existing record using a dedicated transation that is committed if there are not errors.
	UpdateSettings(settings *models.UserSettings) error

	// Delete removes the specified user from the database using a dedicated transation
	// that is committed if there are not errors.
	Delete(id int64) error

	// List retrieves all users in the database.
	List() (*[]models.User, error)
}

// RecipeImageDriver provides functionality to edit and retrieve images attached to recipes.
type RecipeImageDriver interface {
	// Create creates a record in the database using a dedicated transation
	// that is committed if there are not errors.
	Create(imageInfo *models.RecipeImage) error

	// Read retrieves the information about the image from the database, if found.
	// If no image exists with the specified ID, a ErrNotFound error is returned.
	Read(id int64) (*models.RecipeImage, error)

	// ReadMainImage retrieves the information about the main image for the specified recipe
	// image from the database. If no main image exists, a ErrNotFound error is returned.
	ReadMainImage(recipeID int64) (*models.RecipeImage, error)

	// UpdateMainImage sets the id of the main image for the specified recipe
	// using a dedicated transation that is committed if there are not errors.
	UpdateMainImage(image *models.RecipeImage) error

	// List returns a RecipeImage slice that contains data for all images
	// attached to the specified recipe.
	List(recipeID int64) (*[]models.RecipeImage, error)

	// Delete removes the specified image from the backing store and database
	// using a dedicated transation that is committed if there are not errors.
	Delete(id int64) error

	// DeleteAll removes all images for the specified recipe from the database
	// using a dedicated transation that is committed if there are not errors.
	DeleteAll(recipeID int64) error
}
