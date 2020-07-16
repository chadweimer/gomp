BEGIN;

CREATE INDEX recipe_note_recipe_id_idx ON recipe_note(recipe_id);
CREATE INDEX recipe_tag_recipe_id_idx ON recipe_tag(recipe_id);
CREATE INDEX recipe_rating_recipe_id_idx ON recipe_rating(recipe_id);
CREATE INDEX recipe_image_recipe_id_idx ON recipe_image(recipe_id);

COMMIT;