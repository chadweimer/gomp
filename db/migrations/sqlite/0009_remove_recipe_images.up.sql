BEGIN;

ALTER TABLE recipe
ADD COLUMN main_image_name TEXT;

UPDATE recipe
SET main_image_name = (
  SELECT recipe_image.name FROM recipe_image WHERE recipe_image.id = recipe.image_id
);

ALTER TABLE recipe
DROP COLUMN image_id;

DROP TABLE IF EXISTS recipe_image;

COMMIT;
