package models

import "database/sql"

type Unit struct {
	ID          int64
	Name        string
	ShortName   string
	ScaleFactor float64
	Category    string
}

func GetUnitByID(id int64) (*Unit, error) {
	db, err := OpenDatabase()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	var name string
	var shortName string
	var scaleFactor float64
	var category string
	err = db.QueryRow("SELECT name, short_name, scale_factor, category FROM unit WHERE id = $1", id).Scan(&name, &shortName, &scaleFactor, &category)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &Unit{
		ID:          id,
		Name:        name,
		ShortName:   shortName,
		ScaleFactor: scaleFactor,
		Category:    category,
	}, nil

}

func ListUnits() ([]*Unit, error) {
	db, err := OpenDatabase()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	var units []*Unit
	rows, err := db.Query("SELECT id, name, short_name, scale_factor, category FROM unit ORDER BY category")
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id int64
		var name string
		var shortName string
		var scaleFactor float64
		var category string
		rows.Scan(&id, &name, &shortName, &scaleFactor, &category)
		var unit = &Unit{
			ID:          id,
			Name:        name,
			ShortName:   shortName,
			ScaleFactor: scaleFactor,
			Category:    category,
		}
		units = append(units, unit)
	}

	return units, nil
}
