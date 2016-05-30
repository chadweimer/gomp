CREATE TABLE recipe_old(
	id INTEGER NOT NULL PRIMARY KEY,
	name TEXT NOT NULL,
	ingredients TEXT NOT NULL,
	directions TEXT NOT NULL
);
INSERT INTO recipe_old SELECT id,name,ingredients,directions FROM recipe;
DROP TABLE recipe;
ALTER TABLE recipe_old RENAME TO recipe;
ALTER TABLE recipe ADD COLUMN description TEXT NOT NULL DEFAULT '';
CREATE INDEX recipe_name_idx ON recipe(name);
CREATE INDEX recipe_ingredients_idx ON recipe(ingredients);
CREATE INDEX recipe_directions_idx ON recipe(directions);
CREATE INDEX recipe_description_idx ON recipe(description);
