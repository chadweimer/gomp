CREATE TABLE recipe_new(
	id INTEGER NOT NULL PRIMARY KEY,
	name TEXT NOT NULL,
	ingredients TEXT NOT NULL,
	directions TEXT NOT NULL
);
INSERT INTO recipe_new SELECT id,name,ingredients,directions FROM recipe;
DROP TABLE recipe;
ALTER TABLE recipe_new RENAME TO recipe;
ALTER TABLE recipe ADD COLUMN serving_size TEXT NOT NULL DEFAULT '';
ALTER TABLE recipe ADD COLUMN nutrition_info TEXT NOT NULL DEFAULT '';
CREATE INDEX recipe_name_idx ON recipe(name);
CREATE INDEX recipe_ingredients_idx ON recipe(ingredients);
CREATE INDEX recipe_directions_idx ON recipe(directions);
