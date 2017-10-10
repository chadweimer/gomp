ALTER TABLE recipe
ADD COLUMN directions TEXT NOT NULL DEFAULT '';
CREATE INDEX recipe_directions_idx ON recipe(directions);

INSERT INTO recipe (directions)
(SELECT string_agg(recipe_step.directions, '\r\n') FROM recipe_step
WHERE recipe.id = recipe_step.recipe_id
GROUP BY recipe_step.recipe_id);

ALTER TABLE recipe
ALTER COLUMN directions DROP DEFAULT;

DROP TABLE recipe_step;
