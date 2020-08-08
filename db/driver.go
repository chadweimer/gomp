package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type Driver interface {
	Close() error

	Recipes() *RecipeDriver
	Tags() *TagDriver
	Notes() *NoteDriver
	Images() *RecipeImageDriver
	Links() *LinkDriver
	Users() *UserDriver
	Search() *SearchDriver
}

// LinkDriver provides functionality to edit and retrieve recipe links.
type LinkDriver interface {
	// Create stores a link between 2 recipes in the database as a new record
	// using a dedicated transation that is committed if there are not errors.
	Create(recipeID, destRecipeID int64) error

	// CreateTx stores a link between 2 recipes in the database as a new record
	// using the specified transaction.
	CreateTx(recipeID, destRecipeID int64, tx *sqlx.Tx) error

	// Delete removes the linked recipe from the database using a dedicated transation
	// that is committed if there are not errors.
	Delete(recipeID, destRecipeID int64) error

	// DeleteTx removes the linked recipe from the database using the specified transaction.
	DeleteTx(recipeID, destRecipeID int64, tx *sqlx.Tx) error

	// List retrieves all recipes linked to recipe with the specified id.
	List(recipeID int64) (*[]models.RecipeCompact, error)
}

// NoteDriver provides functionality to edit and retrieve notes attached to recipes.
type NoteDriver interface {
	// Create stores the note in the database as a new record using
	// a dedicated transation that is committed if there are not errors.
	Create(note *models.Note) error

	// CreateTx stores the note in the database as a new record using
	// the specified transaction.
	CreateTx(note *models.Note, tx *sqlx.Tx) error

	// Update stores the note in the database by updating the existing record with the specified
	// id using a dedicated transation that is committed if there are not errors.
	Update(note *models.Note) error

	// UpdateTx stores the note in the database by updating the existing record with the specified
	// id using the specified transaction.
	UpdateTx(note *models.Note, tx *sqlx.Tx) error

	// Delete removes the specified note from the database using a dedicated transation
	// that is committed if there are not errors.
	Delete(id int64) error

	// DeleteTx removes the specified note from the database using the specified transaction.
	DeleteTx(id int64, tx *sqlx.Tx) error

	// DeleteAll removes all notes for the specified recipe from the database using a dedicated
	// transation that is committed if there are not errors.
	DeleteAll(recipeID int64) error

	// DeleteAllTx removes all notes for the specified recipe from the database using the specified
	// transaction.
	DeleteAllTx(recipeID int64, tx *sqlx.Tx) error

	// List retrieves all notes associated with the recipe with the specified id.
	List(recipeID int64) (*[]models.Note, error)
}

// TagDriver provides functionality to edit and retrieve tags attached to recipes.
type TagDriver interface {
	// Create stores the tag in the database as a new record using
	// a dedicated transation that is committed if there are not errors.
	Create(recipeID int64, tag string) error

	// CreateTx stores the tag in the database as a new record using
	// the specified transaction.
	CreateTx(recipeID int64, tag string, tx *sqlx.Tx) error

	// DeleteAll removes all tags for the specified recipe from the database using a dedicated
	// transation that is committed if there are not errors.
	DeleteAll(recipeID int64) error

	// DeleteAllTx removes all tags for the specified recipe from the database using the specified
	// transaction.
	DeleteAllTx(recipeID int64, tx *sqlx.Tx) error

	// List retrieves all tags associated with the recipe with the specified id.
	List(recipeID int64) (*[]string, error)
}

// UserDriver provides functionality to edit and authenticate users.
type UserDriver struct {
	// Authenticate verifies the username and password combination match an existing user
	Authenticate(username, password string) (*models.User, error)

	// Create stores the user in the database as a new record using
	// a dedicated transation that is committed if there are not errors.
	Create(user *models.User) error

	// CreateTx stores the user in the database as a new record using
	// the specified transaction.
	CreateTx(user *models.User, tx *sqlx.Tx) error

	Read(id int64) (*models.User, error)

	// Update stores the user in the database by updating the existing record with the specified
	// id using a dedicated transation that is committed if there are not errors.
	Update(user *models.User) error

	// UpdateTx stores the user in the database by updating the existing record with the specified
	// id using the specified transaction.
	UpdateTx(user *models.User, tx *sqlx.Tx) error

	// UpdatePassword updates the associated user's password, first verifying that the existing
	// password is correct, using a dedicated transation that is committed if there are not errors.
	UpdatePassword(id int64, password, newPassword string) error

	// UpdatePasswordTx updates the associated user's password, first verifying that the existing
	// password is correct, using the specified transaction.
	UpdatePasswordTx(id int64, password, newPassword string, tx *sqlx.Tx) error

	// ReadSettings retrieves the settings for the specified user from the database, if found.
	// If no user exists with the specified ID, a NoRecordFound error is returned.
	ReadSettings(id int64) (*models.UserSettings, error)

	// UpdateSettings stores the specified user settings in the database by updating the
	// existing record using a dedicated transation that is committed if there are not errors.
	UpdateSettings(settings *models.UserSettings) error

	// UpdateSettingsTx stores the specified user settings in the database by updating the
	// existing record using the specified transaction.
	UpdateSettingsTx(settings *models.UserSettings, tx *sqlx.Tx) error

	// Delete removes the specified user from the database using a dedicated transation
	// that is committed if there are not errors.
	Delete(id int64) error

	// DeleteTx removes the specified user from the database using the specified transaction.
	DeleteTx(id int64, tx *sqlx.Tx) error

	// List retrieves all users in the database.
	List() (*[]models.User, error)
}
