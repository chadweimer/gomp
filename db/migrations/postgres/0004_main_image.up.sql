BEGIN;

ALTER TABLE recipe_tag
DROP CONSTRAINT recipe_tag_recipe_id_fkey,
ADD CONSTRAINT recipe_tag_recipe_id_fkey FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE;

ALTER TABLE recipe_note
DROP CONSTRAINT recipe_note_recipe_id_fkey,
ADD CONSTRAINT recipe_note_recipe_id_fkey FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE;

ALTER TABLE recipe_rating
DROP CONSTRAINT recipe_rating_recipe_id_fkey,
ADD CONSTRAINT recipe_rating_recipe_id_fkey FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE;

ALTER TABLE recipe_image
DROP CONSTRAINT recipe_image_recipe_id_fkey,
ADD CONSTRAINT recipe_image_recipe_id_fkey FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE;

ALTER TABLE recipe
ADD COLUMN image_id INTEGER REFERENCES recipe_image(id) ON DELETE SET NULL;

UPDATE recipe SET image_id = (SELECT recipe_image.id FROM recipe_image WHERE recipe_image.recipe_id = recipe.id LIMIT 1);

COMMIT;