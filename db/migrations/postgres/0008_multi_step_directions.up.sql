CREATE TABLE recipe_step (
    id SERIAL NOT NULL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    directions TEXT NOT NULL,
    UNIQUE (recipe_id, step_number),
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX recipe_step_directions_idx ON recipe_step(directions);

INSERT INTO recipe_step (recipe_id, step_number, directions)
SELECT recipe.id, 1, recipe.directions FROM recipe;

ALTER TABLE recipe
DROP COLUMN directions;