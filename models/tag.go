package models

import "database/sql"

type TagModel struct {
	*Model
}

func (m *TagModel) Create(recipeID int64, tag string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.CreateTx(recipeID, tag, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (m *TagModel) CreateTx(recipeID int64, tag string, tx *sql.Tx) error {
	_, err := tx.Exec(
		"INSERT INTO recipe_tag (recipe_id, tag) VALUES (?, ?)",
		recipeID, tag)
	return err
}

func (m *TagModel) DeleteAll(recipeID int64) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}

	err = m.DeleteAllTx(recipeID, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (m *TagModel) DeleteAllTx(recipeID int64, tx *sql.Tx) error {
	_, err := tx.Exec(
		"DELETE FROM recipe_tag WHERE recipe_id = ?",
		recipeID)
	return err
}

func (m *TagModel) List(recipeID int64) (*[]string, error) {
	rows, err := m.db.Query(
		"SELECT tag FROM recipe_tag WHERE recipe_id = ?",
		recipeID)
	if err != nil {
		return nil, err
	}

	var tags []string
	for rows.Next() {
		var tag string
		err = rows.Scan(&tag)
		if err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	return &tags, nil
}
