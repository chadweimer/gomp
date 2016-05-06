CREATE TABLE recipe_note (
	id INTEGER NOT NULL PRIMARY KEY,
	recipe_id INTEGER NOT NULL,
	note TEXT,
	created_at DATETIME NOT NULL,
	modified_at DATETIME NOT NULL,
	FOREIGN KEY(recipe_id) REFERENCES recipe(id)
);
