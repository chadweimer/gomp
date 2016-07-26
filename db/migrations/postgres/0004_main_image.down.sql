ALTER TABLE recipe DROP COLUMN image_id;

ALTER TABLE recipe_tag
DROP CONSTRAINT recipe_tag_recipe_id_fkey,
ADD CONSTRAINT recipe_tag_recipe_id_fkey FOREIGN KEY(recipe_id) REFERENCES recipe(id);

ALTER TABLE recipe_note
DROP CONSTRAINT recipe_note_recipe_id_fkey,
ADD CONSTRAINT recipe_note_recipe_id_fkey FOREIGN KEY(recipe_id) REFERENCES recipe(id);

ALTER TABLE recipe_rating
DROP CONSTRAINT recipe_rating_recipe_id_fkey,
ADD CONSTRAINT recipe_rating_recipe_id_fkey FOREIGN KEY(recipe_id) REFERENCES recipe(id);

ALTER TABLE recipe_image
DROP CONSTRAINT recipe_image_recipe_id_fkey,
ADD CONSTRAINT recipe_image_recipe_id_fkey FOREIGN KEY(recipe_id) REFERENCES recipe(id);