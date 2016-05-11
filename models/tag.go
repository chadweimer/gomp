package models

type Tag string

type Tags []Tag

func (tag *Tag) Create(recipeID int64) error {
	tx, err := DB.Sql.Begin();
	if err != nil {
		return err
	}
	defer tx.Commit();
	
	return tag.CreateTx(tx, recipeID)
}

func (tag *Tag) CreateTx(tx DbTx, recipeID int64) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES (?, ?)",
		recipeID, string(*tag))
	return err
}

func (tags *Tags) DeleteAll(recipeID int64) error {
	tx, err := DB.Sql.Begin();
	if err != nil {
		return err
	}
	defer tx.Commit();
	
	return tags.DeleteAllTx(tx, recipeID)
}

func (tags *Tags) DeleteAllTx(tx DbTx, recipeID int64) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = ?",
		recipeID)
	return err
}

func (tags *Tags) List(recipeID int64) error {
	rows, err := DB.Sql.Query(
		"SELECT tag FROM recipe_tag WHERE recipe_id = ?",
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
