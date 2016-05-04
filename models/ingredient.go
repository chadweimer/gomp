package models

import "errors"

// Ingredient represents the details of a single ingredient on a recipe
type Ingredient struct {
	ID            int64
	Name          string
	Amount        float64
	AmountDisplay string
	RecipeID      int64
	Unit          Unit
}

// Ingredients represents a list of ingredients on a recipe
type Ingredients []Ingredient

// Create inserts a new ingredient into the database
func (ingredient *Ingredient) Create(db DbTx) error {
	if ingredient.ID > 0 {
		return errors.New("Ingredient already exists")
	}

	result, err := db.Exec(
		"INSERT INTO recipe_ingredient (name, amount, amount_display, recipe_id, unit_id) VALUES ($1, $2, $3, $4, $5)",
		ingredient.Name, ingredient.Amount, ingredient.AmountDisplay, ingredient.RecipeID, ingredient.Unit.ID)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	ingredient.ID = id
	return nil
}

// Update modifies the data for an existing ingredient in the database
func (ingredient *Ingredient) Update(db DbTx) error {
	if ingredient.ID < 1 {
		return errors.New("No valid ingredient ID specified")
	}

	_, err := db.Exec(
		"UPDATE recipe_ingredient SET name = $1, amount = $2, amount_display = $3, unit_id = $4) WHERE id = $5",
		ingredient.Name, ingredient.Amount, ingredient.AmountDisplay, ingredient.Unit.ID, ingredient.ID)
	return err
}

// DeleteAll deletes all ingredients associated with the specified recipe
func (ingredients *Ingredients) DeleteAll(db DbTx, recipeID int64) error {
	_, err := db.Exec("DELETE FROM recipe_ingredient WHERE recipe_id = $1", recipeID)
	return err
}

// List retrieves all ingredients associated with the specified recipe
func (ingredients *Ingredients) List(db DbTx, recipeID int64) error {
	rows, err := db.Query(
		"SELECT "+
			"ri.name, "+
			"ri.amount, "+
			"ri.amount_display, "+
			"u.id, "+
			"u.name, "+
			"u.short_name, "+
			"u.scale_factor, "+
			"u.category "+
			"FROM recipe_ingredient AS ri "+
			"INNER JOIN unit AS u ON ri.unit_id = u.id "+
			"WHERE ri.recipe_id = $1", recipeID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var ingredient Ingredient
		rows.Scan(
			&ingredient.Name,
			&ingredient.Amount,
			&ingredient.AmountDisplay,
			&ingredient.Unit.ID,
			&ingredient.Unit.Name,
			&ingredient.Unit.ShortName,
			&ingredient.Unit.ScaleFactor,
			&ingredient.Unit.Category)
		*ingredients = append(*ingredients, ingredient)
	}

	return nil
}
