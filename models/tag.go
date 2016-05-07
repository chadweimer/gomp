package models

type Tag string

type Tags []Tag

func (tag *Tag) Create(db DbTx, recipeID int64) error {
	_, err := db.Exec(
		"INSERT INTO recipe_tags (recipe_id, tag) VALUES (?, ?)",
		recipeID, string(*tag))
	return err
}

func (tags *Tags) DeleteAll(db DbTx, recipeID int64) error {
	_, err := db.Exec(
		"DELETE FROM recipe_tags WHERE recipe_id = ?",
		recipeID)
	return err
}

func (tags *Tags) List(db DbTx, recipeID int64) error {
	rows, err := db.Query(
		"SELECT tag FROM recipe_tags WHERE recipe_id = ?",
		recipeID)
	if err != nil {
		return err
	}

	for rows.Next() {
		var tag string
		err = rows.Scan(&tag)
		if err != nil {
			return err
		}
		*tags = append(*tags, Tag(tag))
	}

	return nil
}
