BEGIN;

ALTER TABLE recipe
ADD COLUMN image_id INTEGER REFERENCES recipe_image(id) ON DELETE SET NULL;

UPDATE recipe
SET image_id = (
  SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id AND recipe_image.name = recipe.main_image_name
);

ALTER TABLE recipe
DROP COLUMN main_image_name;

COMMIT;
