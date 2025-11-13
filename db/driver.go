package db

//go:generate go tool mockgen -destination=../mocks/db/mocks.gen.go -package=db . Driver,AppConfigurationDriver,LinkDriver,NoteDriver,RecipeDriver,RecipeImageDriver,UserDriver

import (
	"errors"
	"fmt"
	"io"
	"log/slog"

	"github.com/chadweimer/gomp/models"
)

const (
	// Needed for backward compatibility
	sqliteLegacyDriverName = "sqlite3"
)

// ---- Begin Standard Errors ----

// ErrNotFound represents the error when a database record cannot be
// found matching the criteria specified by the caller
var ErrNotFound = errors.New("no record found matching supplied criteria")

// ErrAuthenticationFailed represents the error when authenticating fails
var ErrAuthenticationFailed = errors.New("username or password invalid")

// ErrMissingID represents the error when no id is provided on an operation that requires it
var ErrMissingID = errors.New("id is required")

// ---- End Standard Errors ----

// Driver represents the interface of a backing data store
type Driver interface {
	io.Closer

	AppConfiguration() AppConfigurationDriver
	Recipes() RecipeDriver
	Notes() NoteDriver
	Images() RecipeImageDriver
	Links() LinkDriver
	Users() UserDriver
}

// CreateDriver returns a Driver implementation based upon the value of the driver parameter
func CreateDriver(cfg Config) (Driver, error) {
	if err := cfg.validate(); err != nil {
		return nil, err
	}

	driver := cfg.Driver

	// Special case for backward compatibility
	if driver == "" {
		slog.Debug("Database driver is empty. Will attempt to infer...")
		if cfg.URL.Scheme == "file" {
			slog.Debug("Setting database driver", "value", SQLiteDriverName)
			driver = SQLiteDriverName
		} else if cfg.URL.Scheme == "postgres" {
			slog.Debug("Setting database driver", "value", PostgresDriverName)
			driver = PostgresDriverName
		} else {
			return nil, errors.New("unable to infer a value for database driver")
		}
	} else if driver == sqliteLegacyDriverName {
		// If the old driver name for sqlite is being used,
		// we'll allow it and map it to the new one
		slog.Debug("Detected database driver legacy value '%s'. Setting to '%s'", sqliteLegacyDriverName, SQLiteDriverName)
		driver = SQLiteDriverName
	}

	switch driver {
	case PostgresDriverName:
		drv, err := openPostgres(
			cfg.URL,
			cfg.MigrationsTableName,
			cfg.MigrationsForceVersion)
		if err != nil {
			return nil, err
		}
		return drv, nil
	case SQLiteDriverName:
		drv, err := openSQLite(
			cfg.URL,
			cfg.MigrationsTableName,
			cfg.MigrationsForceVersion)
		if err != nil {
			return nil, err
		}
		return drv, nil
	}

	return nil, fmt.Errorf("invalid DatabaseDriver '%s' specified", driver)
}

// AppConfigurationDriver provides functionality to edit and retrieve application configuration.
type AppConfigurationDriver interface {
	// Read retrieves the application configuration from the database.
	Read() (*models.AppConfiguration, error)

	// Update stores the application configuration in the database
	// using a dedicated transaction that is committed if there are not errors.
	Update(cfg *models.AppConfiguration) error
}

// LinkDriver provides functionality to edit and retrieve recipe links.
type LinkDriver interface {
	// Create stores a link between 2 recipes in the database as a new record
	// using a dedicated transaction that is committed if there are not errors.
	Create(recipeID, destRecipeID int64) error

	// Delete removes the linked recipe from the database using a dedicated transaction
	// that is committed if there are not errors.
	Delete(recipeID, destRecipeID int64) error

	// List retrieves all recipes linked to recipe with the specified id.
	List(recipeID int64) (*[]models.RecipeCompact, error)
}

// NoteDriver provides functionality to edit and retrieve notes attached to recipes.
type NoteDriver interface {
	// Create stores the note in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	Create(note *models.Note) error

	// Update stores the note in the database by updating the existing record with the specified
	// id using a dedicated transaction that is committed if there are not errors.
	Update(note *models.Note) error

	// Delete removes the specified note from the database using a dedicated transaction
	// that is committed if there are not errors.
	Delete(recipeID, noteID int64) error

	// DeleteAll removes all notes for the specified recipe from the database using a dedicated
	// transaction that is committed if there are not errors.
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

	// GetRating gets the current rating of the specific recipe.
	GetRating(id int64) (*float32, error)

	// SetRating adds or updates the rating of the specified recipe.
	SetRating(id int64, rating float32) error

	// SetState updates the state of the specified recipe.
	SetState(id int64, state models.RecipeState) error

	// Find retrieves all recipes matching the specified search filter and within the range specified.
	Find(filter *models.SearchFilter, page int64, count int64) (*[]models.RecipeCompact, int64, error)

	// Create stores the tag in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	CreateTag(recipeID int64, tag string) error

	// DeleteAll removes all tags for the specified recipe from the database using a dedicated
	// transaction that is committed if there are not errors.
	DeleteAllTags(recipeID int64) error

	// List retrieves all tags associated with the recipe with the specified id.
	ListTags(recipeID int64) (*[]string, error)

	// ListAllTags retrieves all tags across all recipes in the database.
	// The returned map contains the tag as the key and the number of recipes
	// associated with that tag as the value.
	ListAllTags() (*map[string]int, error)
}

// UserDriver provides functionality to edit and authenticate users.
type UserDriver interface {
	// Authenticate verifies the username and password combination match an existing user
	Authenticate(username, password string) (*models.User, error)

	// Create stores the user in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	Create(user *models.User, password string) error

	// Read retrieves the information about the user from the database, if found.
	// If no user exists with the specified ID, a NoRecordFound error is returned.
	Read(id int64) (*UserWithPasswordHash, error)

	// Update stores the user in the database by updating the existing record with the specified
	// id using a dedicated transaction that is committed if there are not errors.
	Update(user *models.User) error

	// Delete removes the specified user from the database using a dedicated transaction
	// that is committed if there are not errors.
	Delete(id int64) error

	// List retrieves all users in the database.
	List() (*[]models.User, error)

	// UpdatePassword updates the associated user's password, first verifying that the existing
	// password is correct, using a dedicated transaction that is committed if there are not errors.
	UpdatePassword(id int64, password, newPassword string) error

	// ReadSettings retrieves the settings for the specified user from the database, if found.
	// If no user exists with the specified ID, a NoRecordFound error is returned.
	ReadSettings(id int64) (*models.UserSettings, error)

	// UpdateSettings stores the specified user settings in the database by updating the
	// existing record using a dedicated transaction that is committed if there are not errors.
	UpdateSettings(settings *models.UserSettings) error

	// CreateSearchFilter stores the search filter in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	CreateSearchFilter(filter *models.SavedSearchFilter) error

	// ReadSearchFilter retrieves the information about the search filter from the database, if found.
	// If no filter exists with the specified ID, a NoRecordFound error is returned.
	ReadSearchFilter(userID int64, filterID int64) (*models.SavedSearchFilter, error)

	// UpdateSearchFilter stores the filter in the database by updating the existing record with the specified
	// id using a dedicated transaction that is committed if there are not errors.
	UpdateSearchFilter(filter *models.SavedSearchFilter) error

	// DeleteSearchFilter removes the specified filter from the database using a dedicated transaction
	// that is committed if there are not errors.
	DeleteSearchFilter(userID int64, filterID int64) error

	// List retrieves all user's saved search filters.
	ListSearchFilters(userID int64) (*[]models.SavedSearchFilterCompact, error)
}

// RecipeImageDriver provides functionality to edit and retrieve images attached to recipes.
type RecipeImageDriver interface {
	// Create creates a record in the database using a dedicated transaction
	// that is committed if there are not errors.
	Create(imageInfo *models.RecipeImage) error

	// Read retrieves the information about the image from the database, if found.
	// If no image exists with the specified ID, a ErrNotFound error is returned.
	Read(recipeID, id int64) (*models.RecipeImage, error)

	// ReadMainImage retrieves the information about the main image for the specified recipe
	// image from the database. If no main image exists, a ErrNotFound error is returned.
	ReadMainImage(recipeID int64) (*models.RecipeImage, error)

	// UpdateMainImage sets the id of the main image for the specified recipe
	// using a dedicated transaction that is committed if there are not errors.
	UpdateMainImage(recipeID, id int64) error

	// List returns a RecipeImage slice that contains data for all images
	// attached to the specified recipe.
	List(recipeID int64) (*[]models.RecipeImage, error)

	// Delete removes the specified image from the backing store and database
	// using a dedicated transaction that is committed if there are not errors.
	Delete(recipeID, id int64) error

	// DeleteAll removes all images for the specified recipe from the database
	// using a dedicated transaction that is committed if there are not errors.
	DeleteAll(recipeID int64) error
}
