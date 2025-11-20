package db

//go:generate go tool mockgen -destination=../mocks/db/mocks.gen.go -package=db . Driver,AppConfigurationDriver,LinkDriver,NoteDriver,RecipeDriver,RecipeImageDriver,UserDriver

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"

	"github.com/chadweimer/gomp/models"
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
	if driver == "" {
		slog.Debug("Database driver is empty. Will attempt to infer...")
		switch cfg.URL.Scheme {
		case "file":
			driver = SQLiteDriverName
		case "postgres":
			driver = PostgresDriverName
		default:
			return nil, errors.New("unable to infer a value for database driver")
		}
	}
	slog.Debug("Using database driver", "value", driver)

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
	default:
		return nil, fmt.Errorf("invalid DatabaseDriver '%s' specified", driver)
	}
}

// AppConfigurationDriver provides functionality to edit and retrieve application configuration.
type AppConfigurationDriver interface {
	// Read retrieves the application configuration from the database.
	Read(ctx context.Context) (*models.AppConfiguration, error)

	// Update stores the application configuration in the database
	// using a dedicated transaction that is committed if there are not errors.
	Update(ctx context.Context, cfg *models.AppConfiguration) error
}

// LinkDriver provides functionality to edit and retrieve recipe links.
type LinkDriver interface {
	// Create stores a link between 2 recipes in the database as a new record
	// using a dedicated transaction that is committed if there are not errors.
	Create(ctx context.Context, recipeID, destRecipeID int64) error

	// Delete removes the linked recipe from the database using a dedicated transaction
	// that is committed if there are not errors.
	Delete(ctx context.Context, recipeID, destRecipeID int64) error

	// List retrieves all recipes linked to recipe with the specified id.
	List(ctx context.Context, recipeID int64) (*[]models.RecipeCompact, error)
}

// NoteDriver provides functionality to edit and retrieve notes attached to recipes.
type NoteDriver interface {
	// Create stores the note in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	Create(ctx context.Context, note *models.Note) error

	// Update stores the note in the database by updating the existing record with the specified
	// id using a dedicated transaction that is committed if there are not errors.
	Update(ctx context.Context, note *models.Note) error

	// Delete removes the specified note from the database using a dedicated transaction
	// that is committed if there are not errors.
	Delete(ctx context.Context, recipeID, noteID int64) error

	// DeleteAll removes all notes for the specified recipe from the database using a dedicated
	// transaction that is committed if there are not errors.
	DeleteAll(ctx context.Context, recipeID int64) error

	// List retrieves all notes associated with the recipe with the specified id.
	List(ctx context.Context, recipeID int64) (*[]models.Note, error)
}

// RecipeDriver provides functionality to edit and retrieve recipes.
type RecipeDriver interface {
	// Create stores the recipe in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	Create(ctx context.Context, recipe *models.Recipe) error

	// Read retrieves the information about the recipe from the database, if found.
	// If no recipe exists with the specified ID, a NoRecordFound error is returned.
	Read(ctx context.Context, id int64) (*models.Recipe, error)

	// Update stores the specified recipe in the database by updating the
	// existing record with the specified id using a dedicated transaction
	// that is committed if there are not errors.
	Update(ctx context.Context, recipe *models.Recipe) error

	// Delete removes the specified recipe from the database using a dedicated transaction
	// that is committed if there are not errors. Note that this method does not delete
	// any attachments that we associated with the deleted recipe.
	Delete(ctx context.Context, id int64) error

	// GetRating gets the current rating of the specific recipe.
	GetRating(ctx context.Context, id int64) (*float32, error)

	// SetRating adds or updates the rating of the specified recipe.
	SetRating(ctx context.Context, id int64, rating float32) error

	// SetState updates the state of the specified recipe.
	SetState(ctx context.Context, id int64, state models.RecipeState) error

	// Find retrieves all recipes matching the specified search filter and within the range specified.
	Find(ctx context.Context, filter *models.SearchFilter, page int64, count int64) (*[]models.RecipeCompact, int64, error)

	// Create stores the tag in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	CreateTag(ctx context.Context, recipeID int64, tag string) error

	// DeleteAll removes all tags for the specified recipe from the database using a dedicated
	// transaction that is committed if there are not errors.
	DeleteAllTags(ctx context.Context, recipeID int64) error

	// List retrieves all tags associated with the recipe with the specified id.
	ListTags(ctx context.Context, recipeID int64) (*[]string, error)

	// ListAllTags retrieves all tags across all recipes in the database.
	// The returned map contains the tag as the key and the number of recipes
	// associated with that tag as the value.
	ListAllTags(ctx context.Context) (*map[string]int, error)
}

// UserDriver provides functionality to edit and authenticate users.
type UserDriver interface {
	// Authenticate verifies the username and password combination match an existing user
	Authenticate(ctx context.Context, username, password string) (*models.User, error)

	// Create stores the user in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	Create(ctx context.Context, user *models.User, password string) error

	// Read retrieves the information about the user from the database, if found.
	// If no user exists with the specified ID, a NoRecordFound error is returned.
	Read(ctx context.Context, id int64) (*UserWithPasswordHash, error)

	// Update stores the user in the database by updating the existing record with the specified
	// id using a dedicated transaction that is committed if there are not errors.
	Update(ctx context.Context, user *models.User) error

	// Delete removes the specified user from the database using a dedicated transaction
	// that is committed if there are not errors.
	Delete(ctx context.Context, id int64) error

	// List retrieves all users in the database.
	List(ctx context.Context) (*[]models.User, error)

	// UpdatePassword updates the associated user's password, first verifying that the existing
	// password is correct, using a dedicated transaction that is committed if there are not errors.
	UpdatePassword(ctx context.Context, id int64, password, newPassword string) error

	// ReadSettings retrieves the settings for the specified user from the database, if found.
	// If no user exists with the specified ID, a NoRecordFound error is returned.
	ReadSettings(ctx context.Context, id int64) (*models.UserSettings, error)

	// UpdateSettings stores the specified user settings in the database by updating the
	// existing record using a dedicated transaction that is committed if there are not errors.
	UpdateSettings(ctx context.Context, settings *models.UserSettings) error

	// CreateSearchFilter stores the search filter in the database as a new record using
	// a dedicated transaction that is committed if there are not errors.
	CreateSearchFilter(ctx context.Context, filter *models.SavedSearchFilter) error

	// ReadSearchFilter retrieves the information about the search filter from the database, if found.
	// If no filter exists with the specified ID, a NoRecordFound error is returned.
	ReadSearchFilter(ctx context.Context, userID int64, filterID int64) (*models.SavedSearchFilter, error)

	// UpdateSearchFilter stores the filter in the database by updating the existing record with the specified
	// id using a dedicated transaction that is committed if there are not errors.
	UpdateSearchFilter(ctx context.Context, filter *models.SavedSearchFilter) error

	// DeleteSearchFilter removes the specified filter from the database using a dedicated transaction
	// that is committed if there are not errors.
	DeleteSearchFilter(ctx context.Context, userID int64, filterID int64) error

	// List retrieves all user's saved search filters.
	ListSearchFilters(ctx context.Context, userID int64) (*[]models.SavedSearchFilterCompact, error)
}

// RecipeImageDriver provides functionality to edit and retrieve images attached to recipes.
type RecipeImageDriver interface {
	// Create creates a record in the database using a dedicated transaction
	// that is committed if there are not errors.
	Create(ctx context.Context, imageInfo *models.RecipeImage) error

	// Read retrieves the information about the image from the database, if found.
	// If no image exists with the specified ID, a ErrNotFound error is returned.
	Read(ctx context.Context, recipeID, id int64) (*models.RecipeImage, error)

	// ReadMainImage retrieves the information about the main image for the specified recipe
	// image from the database. If no main image exists, a ErrNotFound error is returned.
	ReadMainImage(ctx context.Context, recipeID int64) (*models.RecipeImage, error)

	// Update stores the specified image information in the database by updating the existing record
	// with the specified id using a dedicated transaction that is committed if there are not errors.
	Update(ctx context.Context, imageInfo *models.RecipeImage) error

	// UpdateMainImage sets the id of the main image for the specified recipe
	// using a dedicated transaction that is committed if there are not errors.
	UpdateMainImage(ctx context.Context, recipeID, id int64) error

	// List returns a RecipeImage slice that contains data for all images
	// attached to the specified recipe.
	List(ctx context.Context, recipeID int64) (*[]models.RecipeImage, error)

	// Delete removes the specified image from the backing store and database
	// using a dedicated transaction that is committed if there are not errors.
	Delete(ctx context.Context, recipeID, id int64) error

	// DeleteAll removes all images for the specified recipe from the database
	// using a dedicated transaction that is committed if there are not errors.
	DeleteAll(ctx context.Context, recipeID int64) error
}
