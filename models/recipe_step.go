package models

import (
	"github.com/jmoiron/sqlx"
)

// RecipeStepModel provides functionality to edit and retrieve recipe steps.
type RecipeStepModel struct {
	*Model
}

// RecipeStep represents an individual step on a recipe
type RecipeStep struct {
	ID         int64  `json:"id" db:"id"`
	RecipeID   int64  `json:"recipeId" db:"recipe_id"`
	Number     int    `json:"number" db:"step_number"`
	Directions string `json:"directions" db:"directions"`
}

// RecipeSteps represents a collection of RecipeStep objects
type RecipeSteps []RecipeStep

// Create stores the step in the database as a new record using
// a dedicated transation that is committed if there are not errors.
func (m *RecipeStepModel) Create(step *RecipeStep) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.CreateTx(step, tx)
	})
}

// CreateTx stores the step in the database as a new record using
// the specified transaction.
func (m *RecipeStepModel) CreateTx(step *RecipeStep, tx *sqlx.Tx) error {
	stmt := "INSERT INTO recipe_step (recipe_id, step_number, directions) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return tx.Get(step, stmt, step.RecipeID, step.Number, step.Directions)
}

// DeleteAll removes all steps for the specified recipe from the database using a dedicated
// transation that is committed if there are not errors.
func (m *RecipeStepModel) DeleteAll(recipeID int64) error {
	return m.tx(func(tx *sqlx.Tx) error {
		return m.DeleteAllTx(recipeID, tx)
	})
}

// DeleteAllTx removes all steps for the specified recipe from the database using the specified
// transaction.
func (m *RecipeStepModel) DeleteAllTx(recipeID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_step WHERE recipe_id = $1",
		recipeID)
	return err
}

// List retrieves all steps associated with the recipe with the specified id.
func (m *RecipeStepModel) List(recipeID int64) (*RecipeSteps, error) {
	steps := new(RecipeSteps)

	if err := m.db.Select(steps, "SELECT id, recipe_id, step_number, directions FROM recipe_step WHERE recipe_id = $1 ORDER BY step_number ASC", recipeID); err != nil {
		return nil, err
	}

	return steps, nil
}
