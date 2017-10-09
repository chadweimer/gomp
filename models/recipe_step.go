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
	ID          int64  `json:"id" db:"id"`
	RecipeID    int64  `json:"recipeId" db:"recipe_id"`
	Number      int    `json:"number" db:"step_number"`
	Description string `json:"description" db:"description"`
}

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
	stmt := "INSERT INTO recipe_step (recipe_id, step_number, description) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return tx.Get(step, stmt, step.RecipeID, step.Number, step.Description)
}
