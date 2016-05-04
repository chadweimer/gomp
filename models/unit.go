package models

// Unit represents a unit of measure (e.g., tbsp)
type Unit struct {
	ID          int64
	Name        string
	ShortName   string
	ScaleFactor float64
	Category    string
}

// Units represents a list of Unit objects
type Units []Unit

// List retrieves all units from the database
func (units *Units) List(db DbTx) error {
	rows, err := db.Query("SELECT id, name, short_name, scale_factor, category FROM unit ORDER BY category")
	if err != nil {
		return err
	}
	for rows.Next() {
		var unit Unit
		rows.Scan(&unit.ID, &unit.Name, &unit.ShortName, &unit.ScaleFactor, &unit.Category)
		*units = append(*units, unit)
	}

	return nil
}
