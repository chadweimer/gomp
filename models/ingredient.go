package models

type Ingredient struct {
	Name          string
	Amount        float64
	AmountDisplay string
	Unit          *Unit
}

func GetIngredientsByRecipeID(recipeID int64) ([]*Ingredient, error) {
	db, err := OpenDatabase()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	var ingredients []*Ingredient
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
		return nil, err
	}
	for rows.Next() {
		var name string
		var amount float64
		var amountDisplay string
		var unitID int64
		var unitName string
		var unitShortName string
		var unitScaleFactor float64
		var unitCategory string
		rows.Scan(
			&name,
			&amount,
			&amountDisplay,
			&unitID,
			&unitName,
			&unitShortName,
			&unitScaleFactor,
			&unitCategory)
		var ingredient = &Ingredient{
			Name:          name,
			Amount:        amount,
			AmountDisplay: amountDisplay,
			Unit: &Unit{
				ID:          unitID,
				Name:        unitName,
				ShortName:   unitShortName,
				ScaleFactor: unitScaleFactor,
				Category:    unitCategory,
			},
		}
		ingredients = append(ingredients, ingredient)
	}

	return ingredients, nil
}
